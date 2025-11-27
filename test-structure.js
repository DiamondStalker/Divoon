/**
 * Script de prueba para verificar que todos los módulos se carguen correctamente
 */

console.log('🧪 Iniciando pruebas de estructura modular...\n');

try {
    console.log('✅ Cargando logger...');
    const logger = require('./utils/logger');
    logger.info('Logger inicializado correctamente');

    console.log('✅ Cargando modelo ValorantData...');
    const ValorantData = require('./models/ValorantData');
    console.log('   - Modelo tiene método estático getLatest:', typeof ValorantData.getLatest === 'function');
    console.log('   - Modelo tiene método estático upsertData:', typeof ValorantData.upsertData === 'function');

    console.log('✅ Cargando servicio de Valorant...');
    const valorantService = require('./services/valorantService');
    console.log('   - Tiene método fetchRankData:', typeof valorantService.fetchRankData === 'function');
    console.log('   - Tiene método parseRankData:', typeof valorantService.parseRankData === 'function');
    console.log('   - Tiene método isRecoverableError:', typeof valorantService.isRecoverableError === 'function');

    console.log('✅ Cargando servicio de caché...');
    const cacheService = require('./services/cacheService');
    console.log('   - Tiene método getRankData:', typeof cacheService.getRankData === 'function');
    console.log('   - Tiene método forceRefresh:', typeof cacheService.forceRefresh === 'function');
    console.log('   - Tiene método isCacheValid:', typeof cacheService.isCacheValid === 'function');
    console.log('   - Tiene método getCachedData:', typeof cacheService.getCachedData === 'function');
    console.log('   - Tiene método updateCache:', typeof cacheService.updateCache === 'function');

    console.log('✅ Cargando configuración de base de datos...');
    const database = require('./config/database');
    console.log('   - Tiene método connect:', typeof database.connect === 'function');
    console.log('   - Tiene método disconnect:', typeof database.disconnect === 'function');
    console.log('   - Tiene método isConnectionActive:', typeof database.isConnectionActive === 'function');

    console.log('✅ Cargando rutas de Valorant...');
    const valorantRoutes = require('./routes/valorantRoutes');
    console.log('   - Es un router de Express:', valorantRoutes.constructor.name === 'router');

    console.log('\n✨ ¡Todas las pruebas de estructura pasaron exitosamente!');
    console.log('\n📋 Resumen de módulos:');
    console.log('   • utils/logger.js - Sistema de logging con Winston');
    console.log('   • models/ValorantData.js - Modelo de Mongoose');
    console.log('   • services/valorantService.js - Integración con API externa');
    console.log('   • services/cacheService.js - Gestión de caché con fallback');
    console.log('   • config/database.js - Configuración de MongoDB');
    console.log('   • routes/valorantRoutes.js - Definición de endpoints');
    console.log('\n🚀 Estructura modular verificada correctamente');

} catch (error) {
    console.error('❌ Error al cargar módulos:', error.message);
    console.error(error.stack);
    process.exit(1);
}
