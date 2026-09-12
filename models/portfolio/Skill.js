const mongoose = require('mongoose');
const { getConnection } = require('../../config/portfolioDb');

/**
 * Skill — habilidad técnica del portafolio personal.
 * Usa la conexión dedicada a la DB "portfolio".
 */
const skillSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    proficiency: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
    category: {
        type: String,
        required: true,
        enum: [
            'frontend', 'backend', 'database', 'testing', 'automation',
            'devops', 'mobile', 'tools', 'languages', 'frameworks',
            'databases', 'cloud', 'legacy',
        ],
        lowercase: true,
    },
    icon: {
        type: String,
        required: true,
        default: 'Code2',
    },
    description: {
        type: String,
        default: '',
    },
    experience: {
        type: String,
        default: '',
    },
    tags: [{
        type: String,
        lowercase: true,
    }],
    isActive: {
        type: Boolean,
        default: true,
    },
    priority: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
    collection: 'Skills',
});

skillSchema.index({ category: 1, isActive: 1 });
skillSchema.index({ proficiency: -1 });

/**
 * Retorna el modelo Skill ligado a la conexión de portfolio.
 * Se llama una vez y se cachea.
 */
let SkillModel = null;

async function getSkillModel() {
    if (SkillModel) return SkillModel;
    const conn = await getConnection();
    SkillModel = conn.model('Skill', skillSchema);
    return SkillModel;
}

module.exports = { getSkillModel };
