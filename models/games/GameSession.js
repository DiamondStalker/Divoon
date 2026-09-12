const mongoose = require('mongoose');

/**
 * GameSession — representa una partida individual entre Gato y Pingu.
 * Se crea cada vez que SushiGO reporta un ganador.
 */
const GameSessionSchema = new mongoose.Schema({
    winner: {
        type: String,
        required: true,
        enum: ['gato', 'pingu'],
        lowercase: true,
        trim: true,
    },
    gameType: {
        type: String,
        required: true,
        default: 'sushigo',
        trim: true,
    },
    // Inicio del periodo 26→26 en que cayó esta partida
    periodStart: {
        type: Date,
        required: true,
    },
    playedAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
    // Se vuelve true cuando el periodo es cerrado (cierre mensual)
    closed: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
    collection: 'GameSessions',
});

GameSessionSchema.index({ periodStart: 1, closed: 1 });
GameSessionSchema.index({ playedAt: -1 });

/**
 * Conteo de victorias del periodo activo (partidas no cerradas).
 * @param {Date} periodStart
 * @returns {{ gato: number, pingu: number, total: number }}
 */
GameSessionSchema.statics.getActivePeriodCount = async function (periodStart) {
    const results = await this.aggregate([
        { $match: { periodStart, closed: false } },
        { $group: { _id: '$winner', count: { $sum: 1 } } },
    ]);

    const counts = { gato: 0, pingu: 0 };
    results.forEach(r => { counts[r._id] = r.count; });
    counts.total = counts.gato + counts.pingu;

    return counts;
};

/**
 * Marca todas las sesiones del periodo como cerradas.
 * @param {Date} periodStart
 */
GameSessionSchema.statics.closePeriod = async function (periodStart) {
    return await this.updateMany(
        { periodStart, closed: false },
        { $set: { closed: true } }
    );
};

const GameSession = mongoose.model('GameSession', GameSessionSchema);
module.exports = GameSession;
