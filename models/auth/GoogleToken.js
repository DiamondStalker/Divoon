const mongoose = require('mongoose');

/**
 * GoogleToken — almacena el refresh token de Google Calendar por usuario.
 * Un registro por uid (upsert). Usado por Mesesaurios para renovar acceso
 * a Google Calendar sin re-autenticar al usuario.
 */
const googleTokenSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true,
        unique: true,  // unique ya crea el índice — no se necesita googleTokenSchema.index()
        trim: true,
    },
    refresh_token: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
    collection: 'GoogleTokens',
});

const GoogleToken = mongoose.model('GoogleToken', googleTokenSchema);
module.exports = GoogleToken;
