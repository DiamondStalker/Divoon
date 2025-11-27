const ValorantData = require('../models/ValorantData');
const valorantService = require('./valorantService');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class CacheService {
    constructor() {
        this.CACHE_DURATION_HOURS = 1; // Duración del caché en horas
        this.publicDataPath = path.join(__dirname, '../public', 'data.txt');
    }

    /**
     * Calcula las horas desde la última actualización
     * @param {Date} lastUpdated - Fecha de última actualización
     * @returns {number} Horas transcurridas
     */
    calculateHoursSince(lastUpdated) {
        if (!lastUpdated) return Infinity;
        const now = new Date();
        return Math.abs(now - lastUpdated) / 36e5; // 36e5 = 3,600,000 ms = 1 hora
    }

    /**
     * Verifica si el caché es válido (menor a CACHE_DURATION_HOURS)
     * @param {Date} lastUpdated - Fecha de última actualización
     * @returns {boolean} True si el caché es válido
     */
    isCacheValid(lastUpdated) {
        const hoursSince = this.calculateHoursSince(lastUpdated);
        return hoursSince < this.CACHE_DURATION_HOURS;
    }

    /**
     * Guarda los datos en el archivo público
     * @param {Object} data - Datos a guardar
     */
    async saveToPublicFile(data) {
        try {
            const formattedData = {
                DispData: data.DispData,
                dateUpdated: data.dateUpdated || data.dateUptaded, // Compatibilidad con campo antiguo
                range: data.range,
                pl: data.pl
            };

            fs.writeFileSync(
                this.publicDataPath,
                JSON.stringify(formattedData, null, 2),
                'utf8'
            );

            logger.info('Data saved to public file successfully');
        } catch (error) {
            logger.error('Error saving data to public file', {
                error: error.message,
                path: this.publicDataPath,
                stack: error.stack
            });
            // No lanzamos el error para no interrumpir el flujo principal
        }
    }

    /**
     * Obtiene datos desde la base de datos
     * @returns {Promise<Object|null>} Datos del caché o null
     */
    async getCachedData() {
        try {
            const data = await ValorantData.getLatest();

            if (data) {
                logger.info('Cache data retrieved from database', {
                    rank: data.DispData,
                    lastUpdated: data.dateUpdated,
                    hoursSinceUpdate: this.calculateHoursSince(data.dateUpdated).toFixed(2)
                });
            } else {
                logger.info('No cached data found in database');
            }

            return data;
        } catch (error) {
            logger.logDbError(error, 'getCachedData', {
                operation: 'findOne',
            });
            return null;
        }
    }

    /**
     * Actualiza los datos en la base de datos
     * @param {Object} newData - Nuevos datos a guardar
     * @returns {Promise<Object>} Datos guardados
     */
    async updateCache(newData) {
        try {
            const dataToSave = {
                DispData: newData.DispData,
                dateUpdated: new Date(),
                range: newData.range,
                pl: newData.pl
            };

            const updatedData = await ValorantData.upsertData(dataToSave);

            logger.info('Cache updated successfully in database', {
                rank: updatedData.DispData,
                division: updatedData.range,
                rr: updatedData.pl
            });

            // Guardar también en archivo público
            await this.saveToPublicFile(updatedData);

            return updatedData;
        } catch (error) {
            logger.logDbError(error, 'updateCache', {
                operation: 'upsert',
                data: newData
            });
            throw error;
        }
    }

    /**
     * Obtiene datos de rango, ya sea del caché o de la API
     * Implementa fallback a datos antiguos si la API falla
     * @returns {Promise<Object>} Datos de rango con metadata
     */
    async getRankData() {
        try {
            // 1. Obtener datos del caché
            const cachedData = await this.getCachedData();
            const cacheIsValid = cachedData && this.isCacheValid(cachedData.dateUpdated);

            logger.info(`Cache validation result: ${cacheIsValid ? 'VALID' : 'INVALID/EXPIRED'}`);

            // 2. Si el caché es válido, retornarlo
            if (cacheIsValid) {
                logger.info('Returning cached data (still valid)');
                return {
                    data: {
                        DispData: cachedData.DispData,
                        dateUpdated: cachedData.dateUpdated,
                        range: cachedData.range,
                        pl: cachedData.pl
                    },
                    source: 'cache',
                    cached: true,
                    hoursSinceUpdate: this.calculateHoursSince(cachedData.dateUpdated)
                };
            }

            // 3. Si el caché expiró, intentar obtener datos frescos de la API
            logger.info('Cache expired or invalid, fetching fresh data from API');

            try {
                const freshData = await valorantService.fetchRankData();
                const updatedData = await this.updateCache(freshData);

                logger.info('Fresh data obtained and cached successfully');

                return {
                    data: {
                        DispData: updatedData.DispData,
                        dateUpdated: updatedData.dateUpdated,
                        range: updatedData.range,
                        pl: updatedData.pl
                    },
                    source: 'api',
                    cached: false,
                    hoursSinceUpdate: 0
                };
            } catch (apiError) {
                // 4. Si la API falla, usar datos antiguos del caché como fallback
                logger.warn('API request failed, using stale cache as fallback', {
                    error: apiError.message
                });

                if (cachedData) {
                    logger.info('Returning stale cached data due to API error', {
                        rank: cachedData.DispData,
                        age_hours: this.calculateHoursSince(cachedData.dateUpdated).toFixed(2)
                    });

                    return {
                        data: {
                            DispData: cachedData.DispData,
                            dateUpdated: cachedData.dateUpdated,
                            range: cachedData.range,
                            pl: cachedData.pl
                        },
                        source: 'stale_cache',
                        cached: true,
                        stale: true,
                        error: apiError.message,
                        hoursSinceUpdate: this.calculateHoursSince(cachedData.dateUpdated),
                        message: 'Using outdated cache due to API failure'
                    };
                }

                // 5. Si no hay datos en caché y la API falla, lanzar error
                logger.error('No cached data available and API failed', {
                    error: apiError.message
                });

                throw new Error('Unable to retrieve rank data: API failed and no cache available');
            }
        } catch (error) {
            logger.error('Critical error in getRankData', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Fuerza una actualización desde la API, ignorando el caché
     * @returns {Promise<Object>} Datos frescos
     */
    async forceRefresh() {
        try {
            logger.info('Force refresh requested, bypassing cache');
            const freshData = await valorantService.fetchRankData();
            const updatedData = await this.updateCache(freshData);

            return {
                data: {
                    DispData: updatedData.DispData,
                    dateUpdated: updatedData.dateUpdated,
                    range: updatedData.range,
                    pl: updatedData.pl
                },
                source: 'api',
                cached: false,
                forced: true,
                hoursSinceUpdate: 0
            };
        } catch (error) {
            logger.error('Force refresh failed', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

module.exports = new CacheService();
