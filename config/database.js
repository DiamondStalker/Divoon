const mongoose = require('mongoose');
const logger = require('../utils/logger');

class Database {
    constructor() {
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000; // 5 segundos
    }

    /**
     * Configura los event listeners de mongoose
     */
    setupEventListeners() {
        mongoose.connection.on('connected', () => {
            this.isConnected = true;
            logger.info('MongoDB connection established successfully', {
                host: mongoose.connection.host,
                name: mongoose.connection.name
            });
        });

        mongoose.connection.on('error', (err) => {
            this.isConnected = false;
            logger.error('MongoDB connection error', {
                error: err.message,
                stack: err.stack
            });
        });

        mongoose.connection.on('disconnected', () => {
            this.isConnected = false;
            logger.warn('MongoDB connection disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            this.isConnected = true;
            logger.info('MongoDB reconnected successfully');
        });

        // Manejar cierre graceful
        process.on('SIGINT', async () => {
            await this.disconnect();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await this.disconnect();
            process.exit(0);
        });
    }

    /**
     * Conecta a MongoDB con reintentos automáticos
     * @param {string} uri - URI de conexión a MongoDB
     * @returns {Promise<void>}
     */
    async connect(uri) {
        if (!uri) {
            const error = new Error('MongoDB URI is required. Please set MONGO_URI in environment variables.');
            logger.error(error.message);
            throw error;
        }

        this.setupEventListeners();

        const options = {
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 10000,
            family: 4, // Usar IPv4
        };

        while (this.connectionAttempts < this.maxRetries) {
            try {
                this.connectionAttempts++;

                logger.info(`Attempting to connect to MongoDB (attempt ${this.connectionAttempts}/${this.maxRetries})`, {
                    uri: this.maskUri(uri)
                });

                await mongoose.connect(uri, options);

                logger.info('MongoDB connected successfully');
                this.connectionAttempts = 0; // Reset counter on success
                return;
            } catch (error) {
                logger.error(`MongoDB connection attempt ${this.connectionAttempts} failed`, {
                    error: error.message,
                    stack: error.stack,
                    attempt: this.connectionAttempts,
                    maxRetries: this.maxRetries
                });

                if (this.connectionAttempts >= this.maxRetries) {
                    const finalError = new Error(
                        `Failed to connect to MongoDB after ${this.maxRetries} attempts: ${error.message}`
                    );
                    logger.error('Maximum connection attempts reached. Giving up.', {
                        error: finalError.message
                    });
                    throw finalError;
                }

                // Esperar antes de reintentar
                logger.info(`Retrying in ${this.retryDelay / 1000} seconds...`);
                await this.sleep(this.retryDelay);
            }
        }
    }

    /**
     * Desconecta de MongoDB de forma graceful
     * @returns {Promise<void>}
     */
    async disconnect() {
        try {
            if (this.isConnected) {
                logger.info('Closing MongoDB connection...');
                await mongoose.connection.close();
                this.isConnected = false;
                logger.info('MongoDB connection closed successfully');
            }
        } catch (error) {
            logger.error('Error closing MongoDB connection', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Verifica si la conexión está activa
     * @returns {boolean}
     */
    isConnectionActive() {
        return mongoose.connection.readyState === 1;
    }

    /**
     * Obtiene el estado de la conexión como string
     * @returns {string}
     */
    getConnectionStatus() {
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting',
        };
        return states[mongoose.connection.readyState] || 'unknown';
    }

    /**
     * Enmascara la URI para logging seguro
     * @param {string} uri - URI completa
     * @returns {string} URI enmascarada
     */
    maskUri(uri) {
        try {
            const url = new URL(uri);
            if (url.password) {
                url.password = '****';
            }
            return url.toString();
        } catch {
            return 'invalid-uri';
        }
    }

    /**
     * Helper para sleep
     * @param {number} ms - Milisegundos a esperar
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new Database();
