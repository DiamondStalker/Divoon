const mongoose = require('mongoose');

const ValorantDataSchema = new mongoose.Schema({
    DispData: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
    },
    dateUpdated: {
        type: Date,
        required: true,
        default: Date.now,
    },
    range: {
        type: Number,
        required: true,
        min: 1,
        max: 3,
    },
    pl: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
}, {
    timestamps: true, // Añade createdAt y updatedAt automáticamente
    collection: 'ValorantData'
});

// Índices para mejorar rendimiento de consultas
ValorantDataSchema.index({ dateUpdated: -1 });

// Método estático para obtener el último registro
ValorantDataSchema.statics.getLatest = async function() {
    return await this.findOne().sort({ dateUpdated: -1 });
};

// Método estático para actualizar o crear (upsert)
ValorantDataSchema.statics.upsertData = async function(data) {
    return await this.findOneAndUpdate(
        {},
        data,
        {
            new: true,
            upsert: true,
            runValidators: true
        }
    );
};

// Virtual para calcular las horas desde la última actualización
ValorantDataSchema.virtual('hoursSinceUpdate').get(function() {
    const now = new Date();
    return Math.abs(now - this.dateUpdated) / 36e5; // 36e5 = 3,600,000 ms = 1 hora
});

// Asegurar que los virtuals se incluyan al convertir a JSON
ValorantDataSchema.set('toJSON', { virtuals: true });
ValorantDataSchema.set('toObject', { virtuals: true });

const ValorantData = mongoose.model('ValorantData', ValorantDataSchema);

module.exports = ValorantData;
