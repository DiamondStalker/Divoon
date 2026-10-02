const request = require('supertest');
const app = require('../index');

// Mock logger para evitar ruido en tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  http: jest.fn(),
  debug: jest.fn(),
  logApiError: jest.fn(),
  logDbError: jest.fn(),
}));

describe('Valorant Routes', () => {
  describe('GET /valorant', () => {
    it('should return module documentation', async () => {
      const res = await request(app).get('/valorant');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.module).toBe('Valorant Rank Tracker');
      expect(res.body.endpoints).toBeDefined();
    });

    it('should include features in documentation', async () => {
      const res = await request(app).get('/valorant');

      expect(Array.isArray(res.body.features)).toBe(true);
      expect(res.body.features.length).toBeGreaterThan(0);
    });
  });

  describe('GET /valorant/rank', () => {
    it('should return success response with data structure', async () => {
      const res = await request(app).get('/valorant/rank');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.metadata).toBeDefined();
    });

    it('should include required data fields', async () => {
      const res = await request(app).get('/valorant/rank');

      expect(res.body.data.DispData).toBeDefined();
      expect(res.body.data.dateUpdated).toBeDefined();
      expect(res.body.data.range).toBeDefined();
      expect(res.body.data.pl).toBeDefined();
    });

    it('should include metadata with source information', async () => {
      const res = await request(app).get('/valorant/rank');

      expect(['cache', 'api', 'stale_cache']).toContain(res.body.metadata.source);
      expect(typeof res.body.metadata.cached).toBe('boolean');
      expect(res.body.metadata.timestamp).toBeDefined();
    });

    it('should include informative headers', async () => {
      const res = await request(app).get('/valorant/rank');

      expect(res.headers['x-cache-status']).toBeDefined();
      expect(res.headers['x-data-source']).toBeDefined();
      expect(res.headers['x-request-id']).toBeDefined();
    });

    it('should have unique request IDs', async () => {
      const res1 = await request(app).get('/valorant/rank');
      const res2 = await request(app).get('/valorant/rank');

      expect(res1.headers['x-request-id']).not.toBe(res2.headers['x-request-id']);
    });
  });

  describe('GET /valorant/rank/refresh', () => {
    it('should force API refresh', async () => {
      const res = await request(app).get('/valorant/rank/refresh');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.metadata.forced).toBe(true);
    });

    it('should have BYPASS cache status', async () => {
      const res = await request(app).get('/valorant/rank/refresh');

      expect(res.headers['x-cache-status']).toBe('BYPASS');
    });
  });

  describe('GET /valorant/health', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/valorant/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('healthy');
    });

    it('should include cache information', async () => {
      const res = await request(app).get('/valorant/health');

      expect(res.body.cache).toBeDefined();
      expect(typeof res.body.cache.hasData).toBe('boolean');
    });

    it('should include valid timestamp', async () => {
      const res = await request(app).get('/valorant/health');

      expect(res.body.timestamp).toBeDefined();
      expect(() => new Date(res.body.timestamp)).not.toThrow();
    });
  });

  describe('Response Structure', () => {
    it('should always include success field', async () => {
      const endpoints = ['/valorant', '/valorant/rank', '/valorant/health'];

      // eslint-disable-next-line no-restricted-syntax
      for (const endpoint of endpoints) {
        // eslint-disable-next-line no-await-in-loop
        const res = await request(app).get(endpoint);
        expect(typeof res.body.success).toBe('boolean');
      }
    });

    it('should have consistent data structure', async () => {
      const res = await request(app).get('/valorant/rank');

      if (res.body.success) {
        expect(typeof res.body.data).toBe('object');
        expect(typeof res.body.metadata).toBe('object');
      }
    });
  });
});
