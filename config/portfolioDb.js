const mongoose = require('mongoose');
const logger = require('../../utils/logger');

/**
 * Conexión dedicada para la DB "portfolio".
 * Usa el mismo MONGO_URI base pero apunta a la DB "portfolio".
 * Valorant y Games no se ven afectados.
 */

let connection = null;

/**
 * Construye el URI apuntando a la DB "portfolio".
 * Si el URI ya trae una DB al final, la reemplaza.
 * Si no trae ninguna, la concatena.
 *
 * Ejemplos:
 *   mongodb+srv://user:pass@cluster.net          → mongodb+srv://user:pass@cluster.net/portfolio
 *   mongodb+srv://user:pass@cluster.net/test     → mongodb+srv://user:pass@cluster.net/portfolio
 *   mongodb+srv://user:pass@cluster.net/test?... → mongodb+srv://user:pass@cluster.net/portfolio?...
 */
function buildPortfolioUri(baseUri) {
    const url = new URL(baseUri);
    url.pathname = '/portfolio';
    return url.toString();
}

async function getConnection() {
    if (connection && connection.readyState === 1) {
        return connection;
    }

    const baseUri = process.env.MONGO_URI;
    if (!baseUri) {
        throw new Error('MONGO_URI no está definido en las variables de entorno.');
    }

    const portfolioUri = buildPortfolioUri(baseUri);

    logger.info('Connecting to portfolio DB...', {
        db: 'portfolio',
    });

    connection = await mongoose.createConnection(portfolioUri, {
        maxPoolSize: 5,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 10000,
        family: 4,
    }).asPromise();

    connection.on('error', (err) => {
        logger.error('Portfolio DB connection error', { error: err.message });
    });

    connection.on('disconnected', () => {
        logger.warn('Portfolio DB disconnected');
        connection = null;
    });

    connection.on('reconnected', () => {
        logger.info('Portfolio DB reconnected');
    });

    logger.info('Portfolio DB connected', {
        host: connection.host,
        name: connection.name,
    });

    return connection;
}

module.exports = { getConnection };
