/**
 * Script de migración para renombrar dateUptaded -> dateUpdated
 * Ejecutar con: node scripts/migrate-schema.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function migrateSchema() {
    try {
        console.log('🔄 Iniciando migración de esquema...\n');

        // Conectar a MongoDB
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/valorant';
        console.log(`📡 Conectando a MongoDB...`);
        await mongoose.connect(mongoUri);
        console.log('✅ Conectado a MongoDB\n');

        // Obtener la colección directamente
        const db = mongoose.connection.db;
        const collection = db.collection('valorantdatas');

        // Verificar si hay documentos con el campo antiguo
        const oldDocs = await collection.countDocuments({ dateUptaded: { $exists: true } });
        console.log(`📊 Documentos con campo 'dateUptaded': ${oldDocs}`);

        if (oldDocs === 0) {
            console.log('✨ No hay documentos para migrar. El esquema ya está actualizado.');
            await mongoose.connection.close();
            return;
        }

        // Renombrar el campo en todos los documentos
        console.log('\n🔧 Renombrando campo dateUptaded -> dateUpdated...');
        const result = await collection.updateMany(
            { dateUptaded: { $exists: true } },
            { $rename: { dateUptaded: 'dateUpdated' } }
        );

        console.log(`✅ Migración completada:`);
        console.log(`   - Documentos modificados: ${result.modifiedCount}`);
        console.log(`   - Documentos coincidentes: ${result.matchedCount}`);

        // Verificar la migración
        const newDocs = await collection.countDocuments({ dateUpdated: { $exists: true } });
        const remainingOldDocs = await collection.countDocuments({ dateUptaded: { $exists: true } });

        console.log('\n📈 Verificación post-migración:');
        console.log(`   - Documentos con 'dateUpdated': ${newDocs}`);
        console.log(`   - Documentos con 'dateUptaded' restantes: ${remainingOldDocs}`);

        if (remainingOldDocs === 0) {
            console.log('\n✨ ¡Migración exitosa! Todos los documentos han sido actualizados.');
        } else {
            console.log('\n⚠️  Advertencia: Algunos documentos no fueron migrados.');
        }

        await mongoose.connection.close();
        console.log('\n👋 Conexión cerrada. Migración finalizada.');

    } catch (error) {
        console.error('\n❌ Error durante la migración:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Ejecutar migración
migrateSchema();
