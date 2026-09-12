const GameSession = require('../models/games/GameSession');
const MonthlyRecord = require('../models/games/MonthlyRecord');
const logger = require('../utils/logger');

/**
 * Calcula la fecha de inicio del periodo activo (el 26 más reciente).
 * Si hoy es antes del 26: el periodStart es el 26 del mes anterior.
 * Si hoy es el 26 o después: el periodStart es el 26 del mes actual.
 * @returns {Date}
 */
function getActivePeriodStart() {
    const now = new Date();
    const day = now.getUTCDate();
    const month = now.getUTCMonth();
    const year = now.getUTCFullYear();

    if (day >= 26) {
        return new Date(Date.UTC(year, month, 26));
    } else {
        // Mes anterior
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        return new Date(Date.UTC(prevYear, prevMonth, 26));
    }
}

/**
 * Genera el label legible del periodo.
 * Ej: "Diciembre 26 - Enero 26"
 * @param {Date} periodStart
 * @param {Date} periodEnd
 * @returns {string}
 */
function buildPeriodLabel(periodStart, periodEnd) {
    const MONTHS = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const startMonth = MONTHS[periodStart.getUTCMonth()];
    const endMonth = MONTHS[periodEnd.getUTCMonth()];
    return `${startMonth} 26 - ${endMonth} 26`;
}

/**
 * Determina el ganador dado los conteos.
 * @param {{ gato: number, pingu: number }} counts
 * @returns {'gato' | 'pingu' | 'empate'}
 */
function determineWinner(counts) {
    if (counts.gato > counts.pingu) return 'gato';
    if (counts.pingu > counts.gato) return 'pingu';
    return 'empate';
}

class GamesService {

    /**
     * Registra una victoria en el periodo activo.
     * Llamado por SushiGO al terminar una partida.
     * @param {'gato' | 'pingu'} winner
     * @returns {Promise<{ session: object, current: object }>}
     */
    async registerWin(winner) {
        const periodStart = getActivePeriodStart();

        logger.info('Registering game win', { winner, periodStart });

        const session = await GameSession.create({
            winner,
            gameType: 'sushigo',
            periodStart,
            playedAt: new Date(),
        });

        const current = await GameSession.getActivePeriodCount(periodStart);

        logger.info('Win registered successfully', {
            winner,
            periodStart,
            currentCount: current,
        });

        return { session, current };
    }

    /**
     * Retorna el estado actual del periodo activo.
     * Llamado por Mesesaurios en cualquier momento.
     * @returns {Promise<object>}
     */
    async getCurrentPeriod() {
        const periodStart = getActivePeriodStart();
        const counts = await GameSession.getActivePeriodCount(periodStart);

        // Calcular el periodEnd (próximo 26)
        const periodEnd = new Date(periodStart);
        const nextMonth = periodEnd.getUTCMonth() === 11 ? 0 : periodEnd.getUTCMonth() + 1;
        const nextYear = periodEnd.getUTCMonth() === 11
            ? periodEnd.getUTCFullYear() + 1
            : periodEnd.getUTCFullYear();
        periodEnd.setUTCFullYear(nextYear);
        periodEnd.setUTCMonth(nextMonth);

        const label = buildPeriodLabel(periodStart, periodEnd);
        const leading = determineWinner(counts);

        logger.info('Current period fetched', { periodStart, counts, leading });

        return {
            periodStart,
            periodEnd,
            label,
            leading: counts.total === 0 ? 'sin partidas' : leading,
            gato: { wins: counts.gato },
            pingu: { wins: counts.pingu },
            totalGames: counts.total,
        };
    }

    /**
     * Cierra el periodo activo y guarda el histórico.
     * Llamado por Mesesaurios el día 26.
     * @returns {Promise<object>} El MonthlyRecord creado
     */
    async closePeriod() {
        const periodStart = getActivePeriodStart();

        // Calcular el periodEnd
        const periodEnd = new Date(periodStart);
        const nextMonth = periodEnd.getUTCMonth() === 11 ? 0 : periodEnd.getUTCMonth() + 1;
        const nextYear = periodEnd.getUTCMonth() === 11
            ? periodEnd.getUTCFullYear() + 1
            : periodEnd.getUTCFullYear();
        periodEnd.setUTCFullYear(nextYear);
        periodEnd.setUTCMonth(nextMonth);

        logger.info('Closing period', { periodStart, periodEnd });

        // Verificar que no se haya cerrado ya este periodo
        const existing = await MonthlyRecord.findOne({ periodStart });
        if (existing) {
            logger.warn('Period already closed', { periodStart });
            throw new Error(`El periodo ${periodStart.toISOString()} ya fue cerrado anteriormente.`);
        }

        // Obtener conteos actuales
        const counts = await GameSession.getActivePeriodCount(periodStart);

        // Marcar todas las sesiones del periodo como cerradas
        await GameSession.closePeriod(periodStart);

        // Guardar el histórico
        const label = buildPeriodLabel(periodStart, periodEnd);
        const winner = determineWinner(counts);

        const record = await MonthlyRecord.create({
            periodStart,
            periodEnd,
            label,
            winner,
            gato: { wins: counts.gato },
            pingu: { wins: counts.pingu },
            totalGames: counts.total,
            closedAt: new Date(),
        });

        logger.info('Period closed successfully', {
            label,
            winner,
            counts,
            recordId: record._id,
        });

        return record;
    }

    /**
     * Retorna todo el histórico de periodos cerrados.
     * @returns {Promise<object[]>}
     */
    async getHistory() {
        const records = await MonthlyRecord.getAll();
        logger.info('History fetched', { count: records.length });
        return records;
    }

    /**
     * Retorna el histórico filtrado por año.
     * @param {number} year
     * @returns {Promise<object[]>}
     */
    async getHistoryByYear(year) {
        const records = await MonthlyRecord.getByYear(year);
        logger.info('History by year fetched', { year, count: records.length });
        return records;
    }
}

module.exports = new GamesService();
