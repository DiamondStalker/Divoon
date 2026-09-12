const { getSkillModel } = require('../models/portfolio/Skill');
const logger = require('../utils/logger');

/**
 * PortfolioService — lógica de negocio para el portafolio personal.
 * Usa la conexión dedicada a la DB "portfolio".
 */
class PortfolioService {

    /**
     * Obtiene todas las skills activas con filtros opcionales.
     * @param {{ category?: string, sort?: string, order?: string }} options
     * @returns {Promise<object[]>}
     */
    async getSkills({ category, sort = 'proficiency', order = 'desc' } = {}) {
        const Skill = await getSkillModel();
        const filter = { isActive: true };

        if (category) {
            filter.category = category.toLowerCase();
        }

        const sortOrder = order === 'desc' ? -1 : 1;
        const sortObj = { [sort]: sortOrder };

        logger.info('Fetching skills', { filter, sort: sortObj });

        const skills = await Skill.find(filter)
            .sort(sortObj)
            .select('-__v');

        logger.info('Skills fetched', { count: skills.length });

        return skills;
    }

    /**
     * Obtiene skills filtradas por categoría específica.
     * @param {string} category
     * @returns {Promise<object[]>}
     */
    async getSkillsByCategory(category) {
        const Skill = await getSkillModel();

        logger.info('Fetching skills by category', { category });

        const skills = await Skill.find({
            category: category.toLowerCase(),
            isActive: true,
        })
        .sort({ proficiency: -1, priority: -1 })
        .select('-__v');

        logger.info('Skills by category fetched', { category, count: skills.length });

        return skills;
    }

    /**
     * Estadísticas agrupadas por categoría.
     * @returns {Promise<object[]>}
     */
    async getStats() {
        const Skill = await getSkillModel();

        logger.info('Fetching skill stats');

        const stats = await Skill.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    avgProficiency: { $avg: '$proficiency' },
                },
            },
            { $sort: { count: -1 } },
        ]);

        logger.info('Skill stats fetched', { categories: stats.length });

        return stats;
    }
}

module.exports = new PortfolioService();
