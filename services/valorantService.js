const axios = require('axios');
const logger = require('../utils/logger');

class ValorantService {
    constructor() {
        this.apiUrl = process.env.VALORANT_API_URL ||
            'https://api.kyroskoh.xyz/valorant/v1/mmr/na/DiamondStalker/MaMi?show=combo&display=0';

        // Configurar axios con timeout y retry
        this.axiosInstance = axios.create({
            timeout: 10000, // 10 segundos
            headers: {
                'User-Agent': 'Divoon-Valorant-Tracker/1.0'
            }
        });

        // Interceptor para logging de requests
        this.axiosInstance.interceptors.request.use(
            (config) => {
                logger.info(`Making request to Valorant API: ${config.url}`);
                return config;
            },
            (error) => {
                logger.error('Error in request interceptor', error);
                return Promise.reject(error);
            }
        );

        // Interceptor para logging de responses
        this.axiosInstance.interceptors.response.use(
            (response) => {
                logger.info('Valorant API responded successfully');
                return response;
            },
            (error) => {
                // El error se loguea en el método fetchRankData
                return Promise.reject(error);
            }
        );
    }

    /**
     * Parsea la respuesta de la API de Valorant
     * @param {Object} responseData - Datos crudos de la API
     * @returns {Object} Datos parseados { DispData, range, pl }
     */
    parseRankData(responseData) {
        try {
            // Convertir a string, poner en mayúsculas y limpiar
            const rawData = JSON.stringify(responseData)
                .toUpperCase()
                .replace(/rr\.|"/gim, '')
                .split(' ');

            logger.debug(`Raw parsed data: ${JSON.stringify(rawData)}`);

            const parsedData = {
                DispData: rawData[0] || 'UNKNOWN',
                range: rawData[1] ? parseInt(rawData[1]) : 1,
                pl: rawData[3] ? parseInt(rawData[3]) : 0
            };

            logger.info('Rank data parsed successfully', parsedData);
            return parsedData;
        } catch (error) {
            logger.error('Error parsing rank data', {
                error: error.message,
                responseData,
                stack: error.stack
            });
            throw new Error('Failed to parse rank data from API response');
        }
    }

    /**
     * Obtiene los datos de rango desde la API de Valorant
     * @returns {Promise<Object>} Datos parseados del rango
     * @throws {Error} Si la petición falla
     */
    async fetchRankData() {
        try {
            logger.info('Fetching rank data from Valorant API');
            const response = await this.axiosInstance.get(this.apiUrl);

            if (!response.data) {
                throw new Error('Empty response from Valorant API');
            }

            const parsedData = this.parseRankData(response.data);

            logger.info('Successfully fetched and parsed rank data', {
                rank: parsedData.DispData,
                division: parsedData.range,
                rr: parsedData.pl
            });

            return parsedData;
        } catch (error) {
            // Logging detallado del error
            const errorContext = {
                url: this.apiUrl,
                timestamp: new Date().toISOString(),
            };

            if (error.response) {
                // La petición se realizó y el servidor respondió con un código de error
                errorContext.status = error.response.status;
                errorContext.statusText = error.response.statusText;
                errorContext.data = error.response.data;

                logger.logApiError(error, errorContext);

                // Manejar casos específicos
                if (error.response.status === 403) {
                    throw new Error('RATE_LIMIT_EXCEEDED: Too many requests to Valorant API (403)');
                } else if (error.response.status === 429) {
                    throw new Error('RATE_LIMIT_EXCEEDED: Rate limit exceeded (429)');
                } else if (error.response.status >= 500) {
                    throw new Error(`VALORANT_API_ERROR: Server error (${error.response.status})`);
                } else {
                    throw new Error(`VALORANT_API_ERROR: HTTP ${error.response.status} - ${error.response.statusText}`);
                }
            } else if (error.request) {
                // La petición se realizó pero no se recibió respuesta
                errorContext.timeout = error.code === 'ECONNABORTED';
                logger.logApiError(error, errorContext);
                throw new Error('NETWORK_ERROR: No response received from Valorant API');
            } else {
                // Algo pasó al configurar la petición
                logger.error('Error setting up Valorant API request', {
                    message: error.message,
                    stack: error.stack
                });
                throw new Error(`REQUEST_SETUP_ERROR: ${error.message}`);
            }
        }
    }

    /**
     * Verifica si el error es recuperable (podemos usar datos en caché)
     * @param {Error} error - El error a verificar
     * @returns {boolean} True si es un error recuperable
     */
    isRecoverableError(error) {
        const recoverableErrors = [
            'RATE_LIMIT_EXCEEDED',
            'NETWORK_ERROR',
            'VALORANT_API_ERROR',
            'REQUEST_SETUP_ERROR'
        ];

        return recoverableErrors.some(type => error.message.includes(type));
    }
}

module.exports = new ValorantService();
