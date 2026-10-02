const express = require('express');

const router = express.Router();
const gamesService = require('../services/gamesService');
const logger = require('../utils/logger');

/**
 * GET /games
 * Documentación del módulo Games
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    module: 'Games Tracker (SushiGO)',
    description: 'API for tracking game sessions and monthly records',
    warning: '⚠️ NO TESTS: This module operates with shared dev/prod database. Test execution would affect live data.',
    endpoints: {
      registerWin: {
        method: 'POST',
        path: '/games/sushigo/win',
        description: 'Register a game victory',
        body: { winner: 'gato | pingu' },
        rateLimit: 'None (but use responsibly)',
      },
      current: {
        method: 'GET',
        path: '/games/sushigo/current',
        description: 'Get current period stats',
      },
      close: {
        method: 'POST',
        path: '/games/sushigo/close',
        description: 'Close current period and archive',
      },
      history: {
        method: 'GET',
        path: '/games/sushigo/history',
        description: 'Get all historical records',
        queryParams: { year: 'optional - filter by year' },
      },
    },
    features: [
      'Period-based tracking (26th of each month)',
      'Win/loss counts per player',
      'Monthly archive with winner determination',
      'Year-based filtering',
      'Prevent duplicate period closing',
    ],
  });
});

/**
 * POST /games/sushigo/win
 * Registra una victoria. Lo llama SushiGO al terminar una partida.
 *
 * Body: { "winner": "gato" | "pingu" }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     session: { _id, winner, playedAt, periodStart },
 *     current: { gato: { wins }, pingu: { wins }, totalGames }
 *   }
 * }
 */
router.post('/sushigo/win', async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const { winner } = req.body;

    if (!winner || !['gato', 'pingu'].includes(winner.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Campo "winner" requerido. Valores válidos: "gato" o "pingu".',
        requestId,
      });
    }

    logger.info(`[${requestId}] POST /games/sushigo/win`, { winner });

    const result = await gamesService.registerWin(winner.toLowerCase());

    return res.status(201).json({
      success: true,
      data: {
        session: {
          _id: result.session._id,
          winner: result.session.winner,
          playedAt: result.session.playedAt,
          periodStart: result.session.periodStart,
        },
        current: result.current,
      },
      timestamp: new Date().toISOString(),
      requestId,
    });
  } catch (error) {
    logger.error(`[${requestId}] Error in POST /games/sushigo/win`, {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'Error al registrar la victoria.',
      message: error.message,
      requestId,
    });
  }
});

/**
 * GET /games/sushigo/current
 * Estado del periodo activo. Lo consulta Mesesaurios.
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     periodStart, periodEnd, label,
 *     leading: "gato" | "pingu" | "empate" | "sin partidas",
 *     gato: { wins }, pingu: { wins }, totalGames
 *   }
 * }
 */
router.get('/sushigo/current', async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info(`[${requestId}] GET /games/sushigo/current`);

    const data = await gamesService.getCurrentPeriod();

    return res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId,
    });
  } catch (error) {
    logger.error(`[${requestId}] Error in GET /games/sushigo/current`, {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'Error al obtener el periodo activo.',
      message: error.message,
      requestId,
    });
  }
});

/**
 * POST /games/sushigo/close
 * Cierra el periodo activo y guarda el histórico.
 * Lo llama Mesesaurios el día 26.
 *
 * Response:
 * {
 *   success: true,
 *   data: { record: MonthlyRecord }
 * }
 */
router.post('/sushigo/close', async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info(`[${requestId}] POST /games/sushigo/close`);

    const record = await gamesService.closePeriod();

    return res.status(201).json({
      success: true,
      data: { record },
      timestamp: new Date().toISOString(),
      requestId,
    });
  } catch (error) {
    // Si el periodo ya fue cerrado, retornar 409 Conflict
    const isAlreadyClosed = error.message.includes('ya fue cerrado');

    logger.error(`[${requestId}] Error in POST /games/sushigo/close`, {
      error: error.message,
    });

    return res.status(isAlreadyClosed ? 409 : 500).json({
      success: false,
      error: isAlreadyClosed
        ? 'Este periodo ya fue cerrado anteriormente.'
        : 'Error al cerrar el periodo.',
      message: error.message,
      requestId,
    });
  }
});

/**
 * GET /games/sushigo/history
 * Todos los periodos cerrados. Soporta ?year=2025 para filtrar.
 *
 * Response:
 * {
 *   success: true,
 *   data: { records: MonthlyRecord[], count: number }
 * }
 */
router.get('/sushigo/history', async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const { year } = req.query;

    logger.info(`[${requestId}] GET /games/sushigo/history`, { year });

    let records;
    if (year) {
      const parsedYear = parseInt(year, 10);
      if (Number.isNaN(parsedYear)) {
        return res.status(400).json({
          success: false,
          error: 'Parámetro "year" debe ser un número. Ej: ?year=2025',
          requestId,
        });
      }
      records = await gamesService.getHistoryByYear(parsedYear);
    } else {
      records = await gamesService.getHistory();
    }

    return res.json({
      success: true,
      data: {
        records,
        count: records.length,
      },
      timestamp: new Date().toISOString(),
      requestId,
    });
  } catch (error) {
    logger.error(`[${requestId}] Error in GET /games/sushigo/history`, {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      error: 'Error al obtener el histórico.',
      message: error.message,
      requestId,
    });
  }
});

module.exports = router;
