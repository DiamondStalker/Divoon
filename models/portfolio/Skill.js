const mongoose = require('mongoose');

/**
 * Skill — habilidad técnica del portafolio personal.
 * Migrado desde el backend standalone del portafolio.
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

const Skill = mongoose.model('Skill', skillSchema);
module.exports = Skill;
