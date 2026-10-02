const cacheService = require('../../services/cacheService');

// Mock de ValorantData
jest.mock('../../models/ValorantData', () => ({
  getLatest: jest.fn(),
  upsertData: jest.fn(),
}));

// Mock de valorantService
jest.mock('../../services/valorantService', () => ({
  fetchRankData: jest.fn(),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  logDbError: jest.fn(),
}));

const ValorantData = require('../../models/ValorantData');
const valorantService = require('../../services/valorantService');

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateHoursSince', () => {
    it('should return Infinity for null date', () => {
      const result = cacheService.calculateHoursSince(null);
      expect(result).toBe(Infinity);
    });

    it('should return 0 for current date', () => {
      const now = new Date();
      const result = cacheService.calculateHoursSince(now);
      expect(result).toBeLessThan(0.1);
    });

    it('should calculate hours correctly', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = cacheService.calculateHoursSince(twoHoursAgo);
      expect(result).toBeCloseTo(2, 0);
    });
  });

  describe('isCacheValid', () => {
    it('should return true for recent cache (< 1 hour)', () => {
      const recentDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutos atrás
      const result = cacheService.isCacheValid(recentDate);
      expect(result).toBe(true);
    });

    it('should return false for old cache (> 1 hour)', () => {
      const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 horas atrás
      const result = cacheService.isCacheValid(oldDate);
      expect(result).toBe(false);
    });

    it('should return false for null date', () => {
      const result = cacheService.isCacheValid(null);
      expect(result).toBe(false);
    });
  });

  describe('getCachedData', () => {
    it('should return cached data from database', async () => {
      const mockData = {
        DispData: 'PLATINUM',
        dateUpdated: new Date(),
        range: 2,
        pl: 45,
      };

      ValorantData.getLatest.mockResolvedValue(mockData);

      const result = await cacheService.getCachedData();

      expect(result).toEqual(mockData);
      expect(ValorantData.getLatest).toHaveBeenCalled();
    });

    it('should return null if no cached data exists', async () => {
      ValorantData.getLatest.mockResolvedValue(null);

      const result = await cacheService.getCachedData();

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection failed');
      ValorantData.getLatest.mockRejectedValue(error);

      const result = await cacheService.getCachedData();

      expect(result).toBeNull();
    });
  });

  describe('updateCache', () => {
    it('should update cache with new data', async () => {
      const newData = {
        DispData: 'DIAMOND',
        range: 2,
        pl: 75,
      };

      const mockUpdatedData = {
        ...newData,
        dateUpdated: new Date(),
      };

      ValorantData.upsertData.mockResolvedValue(mockUpdatedData);

      const result = await cacheService.updateCache(newData);

      expect(result).toEqual(mockUpdatedData);
      expect(ValorantData.upsertData).toHaveBeenCalled();
    });

    it('should handle database errors during update', async () => {
      const newData = {
        DispData: 'GOLD',
        range: 1,
        pl: 50,
      };

      const error = new Error('Upsert failed');
      ValorantData.upsertData.mockRejectedValue(error);

      await expect(cacheService.updateCache(newData)).rejects.toThrow();
    });
  });

  describe('getRankData', () => {
    it('should return cached data if valid', async () => {
      const recentDate = new Date(Date.now() - 30 * 60 * 1000);
      const mockData = {
        DispData: 'PLATINUM',
        dateUpdated: recentDate,
        range: 2,
        pl: 45,
      };

      ValorantData.getLatest.mockResolvedValue(mockData);

      const result = await cacheService.getRankData();

      expect(result.source).toBe('cache');
      expect(result.cached).toBe(true);
      expect(result.data.DispData).toBe('PLATINUM');
    });

    it('should fetch fresh data if cache is expired', async () => {
      const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const oldData = {
        DispData: 'GOLD',
        dateUpdated: oldDate,
        range: 1,
        pl: 30,
      };

      const freshData = {
        DispData: 'PLATINUM',
        range: 2,
        pl: 50,
      };

      const updatedData = {
        ...freshData,
        dateUpdated: new Date(),
      };

      ValorantData.getLatest.mockResolvedValue(oldData);
      valorantService.fetchRankData.mockResolvedValue(freshData);
      ValorantData.upsertData.mockResolvedValue(updatedData);

      const result = await cacheService.getRankData();

      expect(result.source).toBe('api');
      expect(result.cached).toBe(false);
      expect(valorantService.fetchRankData).toHaveBeenCalled();
    });

    it('should fallback to stale cache if API fails', async () => {
      const staleDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const staleData = {
        DispData: 'PLATINUM',
        dateUpdated: staleDate,
        range: 2,
        pl: 45,
      };

      const apiError = new Error('API_ERROR: Server failed');

      ValorantData.getLatest.mockResolvedValue(staleData);
      valorantService.fetchRankData.mockRejectedValue(apiError);

      const result = await cacheService.getRankData();

      expect(result.source).toBe('stale_cache');
      expect(result.stale).toBe(true);
      expect(result.data.DispData).toBe('PLATINUM');
    });

    it('should throw error if no cache and API fails', async () => {
      ValorantData.getLatest.mockResolvedValue(null);
      valorantService.fetchRankData.mockRejectedValue(new Error('API failed'));

      await expect(cacheService.getRankData()).rejects.toThrow();
    });
  });

  describe('forceRefresh', () => {
    it('should bypass cache and fetch from API', async () => {
      const freshData = {
        DispData: 'DIAMOND',
        range: 3,
        pl: 90,
      };

      const updatedData = {
        ...freshData,
        dateUpdated: new Date(),
      };

      valorantService.fetchRankData.mockResolvedValue(freshData);
      ValorantData.upsertData.mockResolvedValue(updatedData);

      const result = await cacheService.forceRefresh();

      expect(result.source).toBe('api');
      expect(result.forced).toBe(true);
      expect(valorantService.fetchRankData).toHaveBeenCalled();
    });

    it('should handle errors during force refresh', async () => {
      const error = new Error('API connection timeout');
      valorantService.fetchRankData.mockRejectedValue(error);

      await expect(cacheService.forceRefresh()).rejects.toThrow();
    });
  });
});
