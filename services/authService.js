const axios = require('axios');
const GoogleToken = require('../models/auth/GoogleToken');
const logger = require('../utils/logger');

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

class AuthService {

    /**
     * Valida un Firebase ID token contra Google tokeninfo.
     * Retorna el uid (sub) del usuario si es válido.
     * @param {string} idToken
     * @returns {Promise<string>} uid
     */
    async validateIdToken(idToken) {
        try {
            const response = await axios.get(GOOGLE_TOKENINFO_URL, {
                params: { id_token: idToken },
            });

            const { sub, email } = response.data;

            if (!sub) {
                throw new Error('Token inválido: no contiene sub (uid).');
            }

            logger.info('ID token validated', { uid: sub, email });
            return sub;

        } catch (error) {
            if (error.response?.status === 400) {
                throw new Error('ID token inválido o expirado.');
            }
            throw error;
        }
    }

    /**
     * Intercambia un código de autorización por access_token + refresh_token.
     * Guarda el refresh_token en DB (upsert por uid).
     * @param {string} idToken - Firebase ID token del usuario
     * @param {string} code - Código OAuth de Google
     * @returns {Promise<{ accessToken: string }>}
     */
    async exchangeCode(idToken, code) {
        const uid = await this.validateIdToken(idToken);

        logger.info('Exchanging authorization code', { uid });

        const params = new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code',
        });

        let accessToken, refreshToken;

        try {
            const response = await axios.post(GOOGLE_TOKEN_URL, params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            accessToken = response.data.access_token;
            refreshToken = response.data.refresh_token;

        } catch (error) {
            logger.error('Google code exchange failed', {
                uid,
                status: error.response?.status,
                error: error.response?.data || error.message,
            });
            throw new Error('Error al intercambiar el código con Google.');
        }

        if (!refreshToken) {
            logger.warn('Google did not return a refresh_token — code may have been used before', { uid });
            throw new Error('Google no devolvió refresh_token. El código ya fue usado o no incluye offline access.');
        }

        // Upsert: un registro por uid
        await GoogleToken.findOneAndUpdate(
            { uid },
            { uid, refresh_token: refreshToken },
            { upsert: true, new: true }
        );

        logger.info('Refresh token saved', { uid });

        return { accessToken };
    }

    /**
     * Usa el refresh_token almacenado para obtener un nuevo access_token.
     * @param {string} idToken - Firebase ID token del usuario
     * @returns {Promise<{ accessToken: string }>}
     */
    async refreshAccessToken(idToken) {
        const uid = await this.validateIdToken(idToken);

        logger.info('Refreshing access token', { uid });

        const record = await GoogleToken.findOne({ uid });

        if (!record) {
            throw new Error('NOT_FOUND');
        }

        const params = new URLSearchParams({
            refresh_token: record.refresh_token,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token',
        });

        let accessToken;

        try {
            const response = await axios.post(GOOGLE_TOKEN_URL, params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            accessToken = response.data.access_token;

        } catch (error) {
            logger.error('Google token refresh failed', {
                uid,
                status: error.response?.status,
                error: error.response?.data || error.message,
            });
            throw new Error('Error al renovar el token con Google.');
        }

        logger.info('Access token refreshed successfully', { uid });

        return { accessToken };
    }
}

module.exports = new AuthService();
