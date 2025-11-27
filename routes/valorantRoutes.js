const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * GET /valorant/rank
 * Obtiene el rango actual del jugador
 * Retorna datos del caché si son válidos, o consulta la API
 * Si la API falla y el caché expiró, retorna datos antiguos como fallback
 */
router.get('/rank', async (req, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
        logger.info(`[${requestId}] GET /valorant/rank - Request received`);

        const result = await cacheService.getRankData();

        // Agregar headers informativos
        res.set({
            'X-Cache-Status': result.cached ? 'HIT' : 'MISS',
            'X-Data-Source': result.source,
            'X-Data-Age-Hours': result.hoursSinceUpdate.toFixed(2),
            'X-Request-Id': requestId
        });

        // Si es un caché antiguo (stale), agregar header de warning
        if (result.stale) {
            res.set('X-Cache-Warning', 'stale-data-fallback');
            logger.warn(`[${requestId}] Returning stale data due to API error: ${result.error}`);
        }

        logger.info(`[${requestId}] Response sent successfully`, {
            source: result.source,
            cached: result.cached,
            stale: result.stale || false,
            rank: result.data.DispData
        });

        // Retornar respuesta
        return res.json({
            success: true,
            data: result.data,
            metadata: {
                source: result.source,
                cached: result.cached,
                stale: result.stale || false,
                hoursSinceUpdate: parseFloat(result.hoursSinceUpdate.toFixed(2)),
                message: result.message || 'Data retrieved successfully',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error(`[${requestId}] Error processing /valorant/rank request`, {
            error: error.message,
            stack: error.stack
        });

        return res.status(500).json({
            success: false,
            error: 'Error fetching data from Valorant API',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId
        });
    }
});

/**
 * GET /valorant/rank/refresh
 * Fuerza una actualización desde la API, ignorando el caché
 */
router.get('/rank/refresh', async (req, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
        logger.info(`[${requestId}] GET /valorant/rank/refresh - Force refresh requested`);

        const result = await cacheService.forceRefresh();

        res.set({
            'X-Cache-Status': 'BYPASS',
            'X-Data-Source': result.source,
            'X-Request-Id': requestId
        });

        logger.info(`[${requestId}] Force refresh completed successfully`);

        return res.json({
            success: true,
            data: result.data,
            metadata: {
                source: result.source,
                forced: true,
                message: 'Data refreshed successfully',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error(`[${requestId}] Error processing force refresh`, {
            error: error.message,
            stack: error.stack
        });

        return res.status(500).json({
            success: false,
            error: 'Error refreshing data from Valorant API',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId
        });
    }
});

/**
 * GET /valorant/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
    try {
        const cachedData = await cacheService.getCachedData();

        return res.json({
            success: true,
            status: 'healthy',
            cache: {
                hasData: !!cachedData,
                lastUpdate: cachedData?.dateUpdated || null,
                hoursSinceUpdate: cachedData
                    ? cacheService.calculateHoursSince(cachedData.dateUpdated).toFixed(2)
                    : null
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Health check failed', {
            error: error.message,
            stack: error.stack
        });

        return res.status(503).json({
            success: false,
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;
