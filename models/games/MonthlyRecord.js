const mongoose = require('mongoose');

/**
 * MonthlyRecord — histórico de un periodo cerrado (26 → 26).
 * Se crea una vez por cierre mensual desde Mesesaurios.
 */
const MonthlyRecordSchema = new mongoose.Schema({
    // Ej: "2025-12-26T00:00:00.000Z"
    periodStart: {
        type: Date,
        required: true,
        unique: true,
    },
    periodEnd: {
        type: Date,
        required: true,
    },
    // Ej: "Diciembre 26 - Enero 26"
    label: {
        type: String,
        required: true,
        trim: true,
    },
    winner: {
        type: String,
        required: true,
        enum: ['gato', 'pingu', 'empate'],
    },
    gato: {
        wins: { type: Number, required: true, default: 0 },
    },
    pingu: {
        wins: { type: Number, required: true, default: 0 },
    },
    totalGames: {
        type: Number,
        required: true,
        default: 0,
    },
    closedAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
}, {
    timestamps: true,
    collection: 'MonthlyRecords',
});

MonthlyRecordSchema.index({ periodStart: -1 });

/**
 * Obtiene todos los registros ordenados del más reciente al más antiguo.
 */
MonthlyRecordSchema.statics.getAll = async function () {
    return await this.find().sort({ periodStart: -1 });
};

/**
 * Obtiene el resumen anual agrupado por año.
 * Retorna algo como: { 2025: [ ...records ], 2026: [ ...records ] }
 */
MonthlyRecordSchema.statics.getByYear = async function (year) {
    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year + 1}-01-01`);
    return await this.find({
        periodStart: { $gte: start, $lt: end },
    }).sort({ periodStart: 1 });
};

const MonthlyRecord = mongoose.model('MonthlyRecord', MonthlyRecordSchema);
module.exports = MonthlyRecord;
