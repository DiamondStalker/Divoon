const winston = require('winston');
const path = require('path');

// Definir niveles de log personalizados
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Definir colores para cada nivel
const logColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};

winston.addColors(logColors);

// Formato personalizado para logs
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Formato para consola con colores
const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
        (info) => `${info.timestamp} [${info.level}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`
    )
);

// Crear transports
const transports = [
    // Logs de errores en archivo separado
    new winston.transports.File({
        filename: path.join(__dirname, '../logs/error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),
    // Logs combinados (todos los niveles)
    new winston.transports.File({
        filename: path.join(__dirname, '../logs/combined.log'),
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),
    // Logs en consola
    new winston.transports.Console({
        format: consoleFormat,
    }),
];

// Crear logger
const logger = winston.createLogger({
    levels: logLevels,
    level: process.env.LOG_LEVEL || 'info',
    transports,
    exitOnError: false,
});

// Función helper para loguear errores de API con detalles
logger.logApiError = (error, context = {}) => {
    const errorDetails = {
        message: error.message,
        context,
        timestamp: new Date().toISOString(),
    };

    if (error.response) {
        // Error de respuesta HTTP
        errorDetails.status = error.response.status;
        errorDetails.statusText = error.response.statusText;
        errorDetails.data = error.response.data;
        errorDetails.headers = error.response.headers;
    } else if (error.request) {
        // Error de request (no se recibió respuesta)
        errorDetails.request = {
            method: error.config?.method,
            url: error.config?.url,
            timeout: error.config?.timeout,
        };
    }

    if (error.stack) {
        errorDetails.stack = error.stack;
    }

    logger.error(`API Error: ${error.message}`, errorDetails);
    return errorDetails;
};

// Función helper para loguear errores de base de datos
logger.logDbError = (error, operation, context = {}) => {
    const errorDetails = {
        operation,
        message: error.message,
        context,
        timestamp: new Date().toISOString(),
    };

    if (error.stack) {
        errorDetails.stack = error.stack;
    }

    logger.error(`Database Error [${operation}]: ${error.message}`, errorDetails);
    return errorDetails;
};

module.exports = logger;
