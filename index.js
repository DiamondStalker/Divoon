const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const logger = require('./utils/logger');
const database = require('./config/database');
const valorantRoutes = require('./routes/valorantRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });

    next();
});

// Routes
app.use('/valorant', valorantRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Valorant Rank Tracker API',
        version: '2.0.0',
        endpoints: {
            rank: '/valorant/rank',
            refresh: '/valorant/rank/refresh',
            health: '/valorant/health'
        },
        documentation: 'https://github.com/yourusername/times-gates'
    });
});

// 404 handler
app.use((req, res) => {
    logger.warn(`404 Not Found: ${req.method} ${req.path}`);
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        availableEndpoints: {
            rank: '/valorant/rank',
            refresh: '/valorant/rank/refresh',
            health: '/valorant/health'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error in Express', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    });
});

// Inicializar aplicación
async function startServer() {
    try {
        logger.info('Starting Valorant Rank Tracker server...');

        // Conectar a MongoDB
        await database.connect(process.env.MONGO_URI);

        // Iniciar servidor
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`, {
                port: PORT,
                env: process.env.NODE_ENV || 'development',
                nodeVersion: process.version
            });

            logger.info('Available endpoints:', {
                root: `http://localhost:${PORT}/`,
                rank: `http://localhost:${PORT}/valorant/rank`,
                refresh: `http://localhost:${PORT}/valorant/rank/refresh`,
                health: `http://localhost:${PORT}/valorant/health`
            });
        });
    } catch (error) {
        logger.error('Failed to start server', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

// Manejar errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', {
        promise,
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined
    });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack
    });

    // Dar tiempo para que se escriban los logs antes de salir
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

// Iniciar el servidor
startServer();
