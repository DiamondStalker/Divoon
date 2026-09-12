const express = require('express');
const cors = require('cors');
const router = express.Router();
const portfolioService = require('../services/portfolioService');
const logger = require('../utils/logger');

/**
 * CORS restringido — solo acepta requests desde local y el portafolio en producción.
 * Las demás rutas de Divoon no se ven afectadas.
 */
const portfolioCors = cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://diamondstalker.github.io',
        process.env.PORTFOLIO_URL,
    ].filter(Boolean),
    credentials: true,
});

router.use(portfolioCors);
router.options('*', portfolioCors);

/**
 * GET /portfolio/skills
 * Todas las skills activas. Soporta ?category=testing&sort=proficiency&order=desc
 */
router.get('/skills', async (req, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
        const { category, sort, order } = req.query;

        logger.info(`[${requestId}] GET /portfolio/skills`, { category, sort, order });

        const skills = await portfolioService.getSkills({ category, sort, order });

        return res.json({
            success: true,
            statusCode: 200,
            message: 'Skills obtenidas exitosamente',
            data: { skills },
            timestamp: new Date().toISOString(),
            requestId,
        });

    } catch (error) {
        logger.error(`[${requestId}] Error in GET /portfolio/skills`, {
            error: error.message,
            stack: error.stack,
        });

        return res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error interno del servidor',
            error: error.message,
            requestId,
        });
    }
});

/**
 * GET /portfolio/category/:category
 * Skills filtradas por categoría específica.
 * Ejemplo: GET /portfolio/category/testing
 */
router.get('/category/:category', async (req, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
        const { category } = req.params;

        logger.info(`[${requestId}] GET /portfolio/category/${category}`);

        const skills = await portfolioService.getSkillsByCategory(category);

        return res.json({
            success: true,
            statusCode: 200,
            message: `Skills de la categoría ${category} obtenidas exitosamente`,
            data: { skills },
            timestamp: new Date().toISOString(),
            requestId,
        });

    } catch (error) {
        logger.error(`[${requestId}] Error in GET /portfolio/category/:category`, {
            error: error.message,
            stack: error.stack,
        });

        return res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error interno del servidor',
            error: error.message,
            requestId,
        });
    }
});

/**
 * GET /portfolio/skills/stats
 * Estadísticas agrupadas por categoría.
 */
router.get('/skills/stats', async (req, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
        logger.info(`[${requestId}] GET /portfolio/skills/stats`);

        const stats = await portfolioService.getStats();

        return res.json({
            success: true,
            statusCode: 200,
            message: 'Estadísticas obtenidas exitosamente',
            data: { stats },
            timestamp: new Date().toISOString(),
            requestId,
        });

    } catch (error) {
        logger.error(`[${requestId}] Error in GET /portfolio/skills/stats`, {
            error: error.message,
            stack: error.stack,
        });

        return res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Error interno del servidor',
            error: error.message,
            requestId,
        });
    }
});

/**
 * GET /portfolio/health
 * Health check específico del módulo portafolio.
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        module: 'portfolio',
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
