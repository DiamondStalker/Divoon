const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const database = require('./config/database');
const valorantRoutes = require('./routes/valorantRoutes');
const gamesRoutes = require('./routes/gamesRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Trust proxy (Render corre detrás de un proxy) ────────────────────────────
// Necesario para que express-rate-limit lea la IP real del cliente
app.set('trust proxy', 1);

// ── Seguridad ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));

// ── Compresión gzip ──────────────────────────────────────────────────────────
app.use(compression());

// ── CORS restrictivo ─────────────────────────────────────────────────────────
// Solo dominios específicos permitidos
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://divoon.onrender.com',
  'https://diamondstalker.github.io',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
}));

// ── Rate Limiting ────────────────────────────────────────────────────────────
// Limiter global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
  message: 'Demasiadas solicitudes desde esta IP, intenta más tarde.',
  standardHeaders: true, // Retorna rate limit info en `RateLimit-*` headers
  legacyHeaders: false, // Desabilita el header `X-RateLimit-*`
  skip: () => process.env.NODE_ENV === 'development', // No aplicar en desarrollo
});

app.use(globalLimiter);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Request logging ──────────────────────────────────────────────────────────
app.use((req, res, _next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });

  _next();
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
    message: 'Divoon API v3.0.0',
    description: 'Multi-purpose API for gaming, portfolio management, and Valorant rank tracking',
    docs: 'Use /valorant, /games, /portfolio, /auth for module-specific documentation',
    modules: {
      valorant: {
        baseUrl: '/valorant',
        description: 'Valorant rank tracker with smart caching',
        endpoints: {
          rank: 'GET /valorant/rank - Get current rank with cache logic',
          refresh: 'GET /valorant/rank/refresh - Force API refresh',
          health: 'GET /valorant/health - Health check',
          docs: 'GET /valorant - Module documentation',
        },
      },
      games: {
        baseUrl: '/games',
        description: 'SushiGO game session tracking (dev only - no tests)',
        endpoints: {
          registerWin: 'POST /games/sushigo/win - Register victory',
          current: 'GET /games/sushigo/current - Get current period',
          close: 'POST /games/sushigo/close - Close period',
          history: 'GET /games/sushigo/history - Get history',
          historyByYear: 'GET /games/sushigo/history?year=2025 - Get by year',
          docs: 'GET /games - Module documentation',
        },
      },
      portfolio: {
        baseUrl: '/portfolio',
        description: 'Portfolio and skills management',
        endpoints: {
          skills: 'GET /portfolio/skills - Get all skills',
          category: 'GET /portfolio/category/:category - Get by category',
          stats: 'GET /portfolio/skills/stats - Get stats',
          health: 'GET /portfolio/health - Health check',
          docs: 'GET /portfolio - Module documentation',
        },
      },
      auth: {
        baseUrl: '/auth',
        description: 'Authentication and Google Calendar integration',
        endpoints: {
          exchange: 'POST /auth/calendar/exchange - Exchange code for token',
          refresh: 'GET /auth/calendar/refresh - Refresh token',
          docs: 'GET /auth - Module documentation',
        },
      },
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    suggestion: 'Use GET / to see available endpoints',
  });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
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
        valorantDocs: `http://localhost:${PORT}/valorant`,
        valorantRank: `http://localhost:${PORT}/valorant/rank`,
        gameDocs: `http://localhost:${PORT}/games`,
        portfolioDocs: `http://localhost:${PORT}/portfolio`,
        authDocs: `http://localhost:${PORT}/auth`,
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

module.exports = app; // Exportar para tests
