const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const logger = require('./utils/logger');
const database = require('./config/database');
const valorantRoutes = require('./routes/valorantRoutes');
const gamesRoutes = require('./routes/gamesRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Seguridad ────────────────────────────────────────────────────────────────
app.use(helmet({
    crossOriginEmbedderPolicy: false,
}));

// ── Compresión gzip ──────────────────────────────────────────────────────────
app.use(compression());

// ── CORS global (valorant, games, auth) ──────────────────────────────────────
// portfolioRoutes tiene su propio CORS restringido aplicado internamente
app.use(cors());

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Request logging ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });

    next();
});

// ── Rutas ────────────────────────────────────────────────────────────────────
app.use('/valorant', valorantRoutes);
app.use('/games', gamesRoutes);
app.use('/portfolio', portfolioRoutes);
app.use('/auth', authRoutes);

// ── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Divoon API',
        version: '3.0.0',
        modules: {
            valorant: {
                rank: 'GET /valorant/rank',
                refresh: 'GET /valorant/rank/refresh',
                health: 'GET /valorant/health',
            },
            games: {
                registerWin: 'POST /games/sushigo/win',
                currentPeriod: 'GET /games/sushigo/current',
                closePeriod: 'POST /games/sushigo/close',
                history: 'GET /games/sushigo/history',
                historyByYear: 'GET /games/sushigo/history?year=2025',
            },
            portfolio: {
                skills: 'GET /portfolio/skills',
                category: 'GET /portfolio/category/:category',
                stats: 'GET /portfolio/skills/stats',
                health: 'GET /portfolio/health',
            },
            auth: {
                exchange: 'POST /auth/calendar/exchange',
                refresh: 'GET /auth/calendar/refresh',
            },
        },
    });
});

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    logger.warn(`404 Not Found: ${req.method} ${req.path}`);
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
    });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    logger.error('Unhandled error in Express', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
    });
});

// ── Arranque ──────────────────────────────────────────────────────────────────
async function startServer() {
    try {
        logger.info('Starting Divoon API server...');

        await database.connect(process.env.MONGO_URI);

        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`, {
                port: PORT,
                env: process.env.NODE_ENV || 'development',
                nodeVersion: process.version,
            });

            logger.info('Available endpoints:', {
                root: `http://localhost:${PORT}/`,
                valorantRank: `http://localhost:${PORT}/valorant/rank`,
                gamesWin: `http://localhost:${PORT}/games/sushigo/win`,
                gamesCurrent: `http://localhost:${PORT}/games/sushigo/current`,
                portfolioSkills: `http://localhost:${PORT}/portfolio/skills`,
                authExchange: `http://localhost:${PORT}/auth/calendar/exchange`,
                authRefresh: `http://localhost:${PORT}/auth/calendar/refresh`,
            });
        });
    } catch (error) {
        logger.error('Failed to start server', {
            error: error.message,
            stack: error.stack,
        });
        process.exit(1);
    }
}

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
    });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack,
    });

    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

startServer();
