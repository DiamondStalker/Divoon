const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * POST /auth/calendar/exchange
 * Intercambia un código OAuth por access_token y guarda el refresh_token en DB.
 *
 * Body: { idToken: string, code: string }
 *
 * Response 200: { accessToken: string }
 * Response 400: falta idToken o code
 * Response 401: idToken inválido
 * Response 500: error de Google o DB
 */
router.post('/calendar/exchange', async (req, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
        const { idToken, code } = req.body;

        if (!idToken || !code) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren los campos "idToken" y "code".',
                requestId,
            });
        }

        logger.info(`[${requestId}] POST /auth/calendar/exchange`);

        const result = await authService.exchangeCode(idToken, code);

        return res.json({
            success: true,
            accessToken: result.accessToken,
            timestamp: new Date().toISOString(),
            requestId,
        });

    } catch (error) {
        const isAuthError = error.message.includes('inválido') || error.message.includes('expirado');

        logger.error(`[${requestId}] Error in POST /auth/calendar/exchange`, {
            error: error.message,
        });

        return res.status(isAuthError ? 401 : 500).json({
            success: false,
            error: isAuthError ? 'Token de autenticación inválido.' : 'Error al procesar la solicitud.',
            message: error.message,
            requestId,
        });
    }
});

/**
 * GET /auth/calendar/refresh
 * Usa el refresh_token almacenado para emitir un nuevo access_token.
 *
 * Header: Authorization: Bearer <idToken>
 *
 * Response 200: { accessToken: string }
 * Response 401: idToken inválido o ausente
 * Response 404: no hay refresh_token para este usuario
 * Response 500: error de Google
 */
router.get('/calendar/refresh', async (req, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Header Authorization requerido. Formato: Bearer <idToken>',
                requestId,
            });
        }

        const idToken = authHeader.split('Bearer ')[1];

        logger.info(`[${requestId}] GET /auth/calendar/refresh`);

        const result = await authService.refreshAccessToken(idToken);

        return res.json({
            success: true,
            accessToken: result.accessToken,
            timestamp: new Date().toISOString(),
            requestId,
        });

    } catch (error) {
        const isAuthError = error.message.includes('inválido') || error.message.includes('expirado');
        const isNotFound = error.message === 'NOT_FOUND';

        logger.error(`[${requestId}] Error in GET /auth/calendar/refresh`, {
            error: error.message,
        });

        if (isNotFound) {
            return res.status(404).json({
                success: false,
                error: 'No hay refresh token almacenado para este usuario. Debe autenticarse primero.',
                requestId,
            });
        }

        return res.status(isAuthError ? 401 : 500).json({
            success: false,
            error: isAuthError ? 'Token de autenticación inválido.' : 'Error al renovar el token.',
            message: error.message,
            requestId,
        });
    }
});

module.exports = router;
