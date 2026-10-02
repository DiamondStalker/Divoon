const express = require('express');

const router = express.Router();
const rateLimit = require('express-rate-limit');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

// Rate limiter estricto para refresh
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  skip: () => process.env.NODE_ENV === 'development',
});

/**
 * GET /valorant
 * Documentación del módulo Valorant
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    module: 'Valorant Rank Tracker',
    description: 'API for tracking Valorant competitive rank with intelligent caching and fallback mechanisms',
    endpoints: {
      rank: {
        method: 'GET',
        path: '/valorant/rank',
        description: 'Get current player rank with cache logic',
        cacheValidation: '1 hour',
        fallback: 'Returns stale data if API fails',
        response: {
          success: true,
          data: {
            DispData: 'PLATINUM',
            dateUpdated: '2025-11-27T19:00:00.000Z',
            range: 2,
            pl: 45,
          },
          metadata: {
            source: 'cache|api|stale_cache',
            cached: true,
            stale: false,
            hoursSinceUpdate: 0.5,
          },
        },
      },
      refresh: {
        method: 'GET',
        path: '/valorant/rank/refresh',
        description: 'Force immediate API refresh, bypassing cache',
        rateLimit: '5 requests per minute',
        response: {
          success: true,
          data: { /* same as rank */ },
          metadata: {
            source: 'api',
            forced: true,
          },
        },
      },
      health: {
        method: 'GET',
        path: '/valorant/health',
        description: 'Health check for Valorant module and cache status',
        response: {
          success: true,
          status: 'healthy',
          cache: {
            hasData: true,
            lastUpdate: '2025-11-27T18:30:00.000Z',
            hoursSinceUpdate: '0.50',
          },
        },
      },
    },
    features: [
      'Smart 1-hour caching',
      'Automatic fallback to stale data on API failure',
      'Comprehensive error handling (403, 429, timeouts)',
      'Detailed logging of all operations',
      'Request tracking with unique IDs',
      'Informative response headers (X-Cache-Status, X-Data-Source)',
    ],
    headers: {
      'X-Cache-Status': 'HIT | MISS | BYPASS',
      'X-Data-Source': 'cache | api | stale_cache',
      'X-Data-Age-Hours': 'Hours since last update',
      'X-Cache-Warning': 'stale-data-fallback (if applicable)',
      'X-Request-Id': 'Unique request identifier',
    },
  });
});

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
      'X-Request-Id': requestId,
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
      rank: result.data.DispData,
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
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error(`[${requestId}] Error processing /valorant/rank request`, {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'Error fetching data from Valorant API',
      message: error.message,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
});

/**
 * GET /valorant/rank/refresh
 * Fuerza una actualización desde la API, ignorando el caché
 */
router.get('/rank/refresh', strictLimiter, async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info(`[${requestId}] GET /valorant/rank/refresh - Force refresh requested`);

    const result = await cacheService.forceRefresh();

    res.set({
      'X-Cache-Status': 'BYPASS',
      'X-Data-Source': result.source,
      'X-Request-Id': requestId,
    });

    logger.info(`[${requestId}] Force refresh completed successfully`);

    return res.json({
      success: true,
      data: result.data,
      metadata: {
        source: result.source,
        forced: true,
        message: 'Data refreshed successfully',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error(`[${requestId}] Error processing force refresh`, {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'Error refreshing data from Valorant API',
      message: error.message,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
});

/**
 * GET /valorant/health
 * Health check endpoint
 */
router.get('/health', async (_req, res) => {
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
          : null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check failed', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
