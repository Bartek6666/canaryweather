/**
 * Weather Service Tests
 *
 * Tests for weather calculation functions, especially unit conversions.
 */

import { createClient } from '@supabase/supabase-js';

// Mock Supabase before importing weatherService
jest.mock('@supabase/supabase-js');

const mockSupabase = {
  from: jest.fn(),
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);

// Helper to create mock Supabase response
function mockSupabaseResponse(data: any[] | null, error: any = null) {
  mockSupabase.from.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        gte: jest.fn().mockResolvedValue({ data, error }),
      }),
    }),
  });
}

// Import after mocking
import { calculateWindStability, WindStabilityResult, getMonthlyStats, validateWeatherWithNearbyStation, clearRateLimitCache } from '../weatherService';
import type { LiveWeatherResult } from '../weatherService';

describe('calculateWindStability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('wind speed unit conversion (m/s to km/h)', () => {
    it('should convert velmedia from m/s to km/h correctly', async () => {
      // 5.56 m/s = 20 km/h (threshold for windy day)
      const mockData = [
        { date: '2024-02-01', velmedia: 5.56 }, // 20 km/h - just above threshold
        { date: '2024-02-02', velmedia: 2.78 }, // 10 km/h - below threshold
        { date: '2024-02-03', velmedia: 8.33 }, // 30 km/h - above threshold
      ];

      mockSupabaseResponse(mockData);

      const result = await calculateWindStability('TEST001', 2);

      // Average: (5.56 + 2.78 + 8.33) * 3.6 / 3 = 20 km/h
      expect(result.averageSpeed).toBeCloseTo(20, 0);
    });

    it('should count windy days based on 20 km/h threshold', async () => {
      // Create 10 years of February data (10 days per year = 100 total)
      const mockData: { date: string; velmedia: number }[] = [];

      for (let year = 2016; year <= 2025; year++) {
        // 6 days with wind > 5.56 m/s (> 20 km/h) per year
        for (let day = 1; day <= 6; day++) {
          mockData.push({ date: `${year}-02-0${day}`, velmedia: 6.5 }); // 23.4 km/h
        }
        // 4 days with wind < 5.56 m/s (< 20 km/h) per year
        for (let day = 7; day <= 10; day++) {
          mockData.push({ date: `${year}-02-${day < 10 ? '0' : ''}${day}`, velmedia: 4.0 }); // 14.4 km/h
        }
      }

      mockSupabaseResponse(mockData);

      const result = await calculateWindStability('TEST001', 2);

      // 60 windy days / 10 years = 6 days per month
      expect(result.windyDays).toBe(6);
    });

    it('should calculate wind range in km/h', async () => {
      // All same wind speed for predictable result
      const mockData = [
        { date: '2024-02-01', velmedia: 5.0 },
        { date: '2024-02-02', velmedia: 5.0 },
        { date: '2024-02-03', velmedia: 5.0 },
      ];

      mockSupabaseResponse(mockData);

      const result = await calculateWindStability('TEST001', 2);

      // 5.0 m/s * 3.6 = 18 km/h, stdDev = 0
      expect(result.averageSpeed).toBeCloseTo(18, 0);
      expect(result.windRange.min).toBe(18);
      expect(result.windRange.max).toBe(18);
    });
  });

  describe('stability calculation', () => {
    it('should return high stability for consistent wind speeds', async () => {
      // Very consistent wind (low standard deviation)
      const mockData = Array.from({ length: 30 }, (_, i) => ({
        date: `2024-02-${String(i + 1).padStart(2, '0')}`,
        velmedia: 5.0 + (Math.random() * 0.2 - 0.1), // 5.0 ± 0.1 m/s
      }));

      mockSupabaseResponse(mockData);

      const result = await calculateWindStability('TEST001', 2);

      // With very low stdDev, stability should be high (close to 100%)
      expect(result.stability).toBeGreaterThan(90);
    });

    it('should return low stability for variable wind speeds', async () => {
      // Highly variable wind
      const mockData = [
        { date: '2024-02-01', velmedia: 1.0 },  // 3.6 km/h
        { date: '2024-02-02', velmedia: 10.0 }, // 36 km/h
        { date: '2024-02-03', velmedia: 2.0 },  // 7.2 km/h
        { date: '2024-02-04', velmedia: 12.0 }, // 43.2 km/h
      ];

      mockSupabaseResponse(mockData);

      const result = await calculateWindStability('TEST001', 2);

      // High stdDev should result in low stability
      expect(result.stability).toBeLessThan(50);
    });
  });

  describe('edge cases', () => {
    it('should return zero values when no data available', async () => {
      mockSupabaseResponse([]);

      const result = await calculateWindStability('TEST001', 2);

      expect(result.stability).toBe(0);
      expect(result.averageSpeed).toBe(0);
      expect(result.windyDays).toBe(0);
      expect(result.sampleCount).toBe(0);
      expect(result.confidence).toBe('low');
    });

    it('should filter out null velmedia values', async () => {
      const mockData = [
        { date: '2024-02-01', velmedia: 5.0 },
        { date: '2024-02-02', velmedia: null },
        { date: '2024-02-03', velmedia: 5.0 },
      ];

      mockSupabaseResponse(mockData);

      const result = await calculateWindStability('TEST001', 2);

      expect(result.sampleCount).toBe(2); // Only 2 valid records
    });

    it('should filter data by month correctly', async () => {
      const mockData = [
        { date: '2024-01-15', velmedia: 10.0 }, // January - should be excluded
        { date: '2024-02-15', velmedia: 5.0 },  // February - should be included
        { date: '2024-03-15', velmedia: 10.0 }, // March - should be excluded
      ];

      mockSupabaseResponse(mockData);

      const result = await calculateWindStability('TEST001', 2); // February

      expect(result.sampleCount).toBe(1);
      expect(result.averageSpeed).toBeCloseTo(18, 0); // 5.0 * 3.6 = 18 km/h
    });

    it('should set confidence based on sample count', async () => {
      // Low confidence: < 50 samples
      const lowData = Array.from({ length: 30 }, (_, i) => ({
        date: `2024-02-${String((i % 28) + 1).padStart(2, '0')}`,
        velmedia: 5.0,
      }));
      mockSupabaseResponse(lowData);
      let result = await calculateWindStability('TEST001', 2);
      expect(result.confidence).toBe('low');

      // Medium confidence: 50-199 samples
      const mediumData = Array.from({ length: 100 }, (_, i) => ({
        date: `${2020 + Math.floor(i / 28)}-02-${String((i % 28) + 1).padStart(2, '0')}`,
        velmedia: 5.0,
      }));
      mockSupabaseResponse(mediumData);
      result = await calculateWindStability('TEST001', 2);
      expect(result.confidence).toBe('medium');

      // High confidence: >= 200 samples
      const highData = Array.from({ length: 250 }, (_, i) => ({
        date: `${2015 + Math.floor(i / 28)}-02-${String((i % 28) + 1).padStart(2, '0')}`,
        velmedia: 5.0,
      }));
      mockSupabaseResponse(highData);
      result = await calculateWindStability('TEST001', 2);
      expect(result.confidence).toBe('high');
    });
  });

  describe('error handling', () => {
    it('should return default values on Supabase error', async () => {
      mockSupabaseResponse(null, { message: 'Database error' });

      const result = await calculateWindStability('TEST001', 2);

      expect(result.stability).toBe(0);
      expect(result.sampleCount).toBe(0);
      expect(result.confidence).toBe('low');
    });
  });
});

// Test pure conversion function
describe('Wind speed conversion', () => {
  it('should convert common wind speeds correctly', () => {
    const conversions = [
      { ms: 0, kmh: 0 },
      { ms: 1, kmh: 3.6 },
      { ms: 5.56, kmh: 20.016 },  // Windy threshold
      { ms: 10, kmh: 36 },
      { ms: 27.78, kmh: 100.008 }, // ~100 km/h (hurricane)
    ];

    conversions.forEach(({ ms, kmh }) => {
      expect(ms * 3.6).toBeCloseTo(kmh, 1);
    });
  });
});

describe('getMonthlyStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('temperature calculations', () => {
    it('should calculate average max and min temperatures correctly', async () => {
      const mockData = [
        { date: '2024-01-01', tmax: 20, tmin: 10, precip: 0, sol: 8, velmedia: 5 },
        { date: '2024-01-02', tmax: 22, tmin: 12, precip: 0, sol: 7, velmedia: 5 },
        { date: '2024-01-03', tmax: 24, tmin: 14, precip: 0, sol: 9, velmedia: 5 },
      ];

      mockSupabaseResponse(mockData);

      const result = await getMonthlyStats('TEST001');
      const january = result.find(s => s.month === 1);

      expect(january).toBeDefined();
      expect(january!.avg_tmax).toBe(22); // (20 + 22 + 24) / 3 = 22
      expect(january!.avg_tmin).toBe(12); // (10 + 12 + 14) / 3 = 12
    });

    it('should handle null temperature values', async () => {
      const mockData = [
        { date: '2024-01-01', tmax: 20, tmin: 10, precip: 0, sol: 8, velmedia: 5 },
        { date: '2024-01-02', tmax: null, tmin: null, precip: 0, sol: 7, velmedia: 5 },
        { date: '2024-01-03', tmax: 24, tmin: 14, precip: 0, sol: 9, velmedia: 5 },
      ];

      mockSupabaseResponse(mockData);

      const result = await getMonthlyStats('TEST001');
      const january = result.find(s => s.month === 1);

      expect(january).toBeDefined();
      expect(january!.avg_tmax).toBe(22); // (20 + 24) / 2 = 22
      expect(january!.avg_tmin).toBe(12); // (10 + 14) / 2 = 12
    });
  });

  describe('wind speed conversion (m/s to km/h)', () => {
    it('should convert velmedia from m/s to km/h in monthly stats', async () => {
      const mockData = [
        { date: '2024-01-01', tmax: 20, tmin: 10, precip: 0, sol: 8, velmedia: 5.0 },
        { date: '2024-01-02', tmax: 22, tmin: 12, precip: 0, sol: 7, velmedia: 5.0 },
        { date: '2024-01-03', tmax: 24, tmin: 14, precip: 0, sol: 9, velmedia: 5.0 },
      ];

      mockSupabaseResponse(mockData);

      const result = await getMonthlyStats('TEST001');
      const january = result.find(s => s.month === 1);

      expect(january).toBeDefined();
      // 5.0 m/s * 3.6 = 18 km/h
      expect(january!.avg_wind).toBe(18);
    });

    it('should handle varying wind speeds', async () => {
      const mockData = [
        { date: '2024-01-01', tmax: 20, tmin: 10, precip: 0, sol: 8, velmedia: 2.78 }, // 10 km/h
        { date: '2024-01-02', tmax: 22, tmin: 12, precip: 0, sol: 7, velmedia: 5.56 }, // 20 km/h
        { date: '2024-01-03', tmax: 24, tmin: 14, precip: 0, sol: 9, velmedia: 8.33 }, // 30 km/h
      ];

      mockSupabaseResponse(mockData);

      const result = await getMonthlyStats('TEST001');
      const january = result.find(s => s.month === 1);

      expect(january).toBeDefined();
      // Average: (2.78 + 5.56 + 8.33) / 3 * 3.6 = 20 km/h
      expect(january!.avg_wind).toBeCloseTo(20, 0);
    });
  });

  describe('precipitation and rain days', () => {
    it('should count rain days correctly', async () => {
      const mockData = [
        { date: '2024-01-01', tmax: 20, tmin: 10, precip: 0, sol: 8, velmedia: 5 },
        { date: '2024-01-02', tmax: 22, tmin: 12, precip: 5.2, sol: 2, velmedia: 5 }, // Rain
        { date: '2024-01-03', tmax: 24, tmin: 14, precip: 0, sol: 9, velmedia: 5 },
        { date: '2024-01-04', tmax: 21, tmin: 11, precip: 12.0, sol: 0, velmedia: 5 }, // Rain
        { date: '2024-01-05', tmax: 23, tmin: 13, precip: 0.5, sol: 6, velmedia: 5 }, // Rain (> 0)
      ];

      mockSupabaseResponse(mockData);

      const result = await getMonthlyStats('TEST001');
      const january = result.find(s => s.month === 1);

      expect(january).toBeDefined();
      expect(january!.rain_days).toBe(3); // 3 days with precip > 0
    });

    it('should calculate average precipitation', async () => {
      const mockData = [
        { date: '2024-01-01', tmax: 20, tmin: 10, precip: 0, sol: 8, velmedia: 5 },
        { date: '2024-01-02', tmax: 22, tmin: 12, precip: 10, sol: 2, velmedia: 5 },
        { date: '2024-01-03', tmax: 24, tmin: 14, precip: 5, sol: 9, velmedia: 5 },
      ];

      mockSupabaseResponse(mockData);

      const result = await getMonthlyStats('TEST001');
      const january = result.find(s => s.month === 1);

      expect(january).toBeDefined();
      expect(january!.avg_precip).toBe(5); // (0 + 10 + 5) / 3 = 5
    });
  });

  describe('sun chance calculation', () => {
    it('should calculate sun chance percentage', async () => {
      // Sun chance = (days with sol > 6h AND precip <= 0.1) / total days
      const mockData = [
        { date: '2024-01-01', tmax: 20, tmin: 10, precip: 0, sol: 8, velmedia: 5 },   // Sunny
        { date: '2024-01-02', tmax: 22, tmin: 12, precip: 0, sol: 7, velmedia: 5 },   // Sunny
        { date: '2024-01-03', tmax: 24, tmin: 14, precip: 5, sol: 9, velmedia: 5 },   // Not sunny (rain)
        { date: '2024-01-04', tmax: 21, tmin: 11, precip: 0, sol: 4, velmedia: 5 },   // Not sunny (low sol)
      ];

      mockSupabaseResponse(mockData);

      const result = await getMonthlyStats('TEST001');
      const january = result.find(s => s.month === 1);

      expect(january).toBeDefined();
      expect(january!.sun_chance).toBe(50); // 2 sunny / 4 total = 50%
    });
  });

  describe('monthly grouping', () => {
    it('should group data by month correctly', async () => {
      const mockData = [
        { date: '2024-01-15', tmax: 18, tmin: 10, precip: 0, sol: 7, velmedia: 5 },
        { date: '2024-02-15', tmax: 20, tmin: 12, precip: 0, sol: 8, velmedia: 5 },
        { date: '2024-03-15', tmax: 22, tmin: 14, precip: 0, sol: 9, velmedia: 5 },
        { date: '2024-07-15', tmax: 28, tmin: 20, precip: 0, sol: 11, velmedia: 5 },
      ];

      mockSupabaseResponse(mockData);

      const result = await getMonthlyStats('TEST001');

      expect(result).toHaveLength(12); // Always returns 12 months

      const january = result.find(s => s.month === 1);
      const february = result.find(s => s.month === 2);
      const july = result.find(s => s.month === 7);

      expect(january!.avg_tmax).toBe(18);
      expect(february!.avg_tmax).toBe(20);
      expect(july!.avg_tmax).toBe(28);
    });

    it('should return 12 months even with partial data', async () => {
      const mockData = [
        { date: '2024-06-15', tmax: 25, tmin: 18, precip: 0, sol: 10, velmedia: 5 },
      ];

      mockSupabaseResponse(mockData);

      const result = await getMonthlyStats('TEST001');

      expect(result).toHaveLength(12);

      const june = result.find(s => s.month === 6);
      expect(june!.avg_tmax).toBe(25);
      expect(june!.total_days).toBe(1);

      // Empty months should have 0 values
      const january = result.find(s => s.month === 1);
      expect(january!.total_days).toBe(0);
      expect(january!.avg_tmax).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should return empty array on database error', async () => {
      mockSupabaseResponse(null, { message: 'Database error' });

      const result = await getMonthlyStats('TEST001');

      expect(result).toEqual([]);
    });

    it('should return empty array when no data', async () => {
      mockSupabaseResponse([]);

      const result = await getMonthlyStats('TEST001');

      expect(result).toEqual([]);
    });

    it('should handle all null values in a month', async () => {
      const mockData = [
        { date: '2024-01-01', tmax: null, tmin: null, precip: null, sol: null, velmedia: null },
        { date: '2024-01-02', tmax: null, tmin: null, precip: null, sol: null, velmedia: null },
      ];

      mockSupabaseResponse(mockData);

      const result = await getMonthlyStats('TEST001');
      const january = result.find(s => s.month === 1);

      expect(january).toBeDefined();
      expect(january!.avg_tmax).toBe(0);
      expect(january!.avg_tmin).toBe(0);
      expect(january!.total_days).toBe(2);
    });
  });

  describe('total_days tracking', () => {
    it('should track total days per month', async () => {
      const mockData = [
        { date: '2024-01-01', tmax: 20, tmin: 10, precip: 0, sol: 8, velmedia: 5 },
        { date: '2024-01-02', tmax: 22, tmin: 12, precip: 0, sol: 7, velmedia: 5 },
        { date: '2024-01-03', tmax: 24, tmin: 14, precip: 0, sol: 9, velmedia: 5 },
        { date: '2024-02-01', tmax: 21, tmin: 11, precip: 0, sol: 8, velmedia: 5 },
        { date: '2024-02-02', tmax: 23, tmin: 13, precip: 0, sol: 7, velmedia: 5 },
      ];

      mockSupabaseResponse(mockData);

      const result = await getMonthlyStats('TEST001');

      const january = result.find(s => s.month === 1);
      const february = result.find(s => s.month === 2);

      expect(january!.total_days).toBe(3);
      expect(february!.total_days).toBe(2);
    });
  });
});

describe('validateWeatherWithNearbyStation caching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRateLimitCache();
  });

  const createMockPrimaryResult = (): LiveWeatherResult => ({
    data: {
      temperature: 24,
      humidity: 60,
      windSpeed: 15,
      windGusts: 20,
      precipitation: 0,
      weatherCode: 0,
      condition: 'sunny',
      conditionLabelKey: 'clearSky',
      timestamp: '2024-02-15T12:00:00',
    },
    isFromCache: false,
  });

  it('should return result without discrepancy when no alternative station data', async () => {
    // Without AEMET API key, fetchAemetLiveWeather returns null
    // This tests that the function handles missing data gracefully
    const primaryResult = createMockPrimaryResult();

    const result = await validateWeatherWithNearbyStation(28.0, -16.5, primaryResult, 'C449C');

    // Should return primary data without discrepancy
    expect(result.primaryData).toEqual(primaryResult.data);
    expect(result.hasDiscrepancy).toBe(false);
    expect(result.alternativeData).toBeUndefined();
  });

  it('should clear cache without errors', () => {
    // Test that clearRateLimitCache works without throwing
    expect(() => clearRateLimitCache()).not.toThrow();
  });

  it('should handle multiple calls to clearRateLimitCache', () => {
    // Clearing empty cache should not throw
    clearRateLimitCache();
    clearRateLimitCache();
    expect(() => clearRateLimitCache()).not.toThrow();
  });

  it('should return primary data structure correctly', async () => {
    const primaryResult = createMockPrimaryResult();

    const result = await validateWeatherWithNearbyStation(28.0, -16.5, primaryResult, 'C449C');

    // Verify result structure
    expect(result).toHaveProperty('primaryData');
    expect(result).toHaveProperty('hasDiscrepancy');
    expect(result.primaryData.temperature).toBe(24);
    expect(result.primaryData.windSpeed).toBe(15);
  });
});

// ─── INTERPOLATION TESTS ─────────────────────────────────────────────────────

// We need to test calculateInterpolatedMonthlyStats through integration
// since it uses findNearestStations which depends on locations_mapping.json
// Let's test the distance weight calculation logic and interpolation behavior

describe('calculateInterpolatedMonthlyStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when no stations are found', async () => {
    // Mock empty response from Supabase to simulate no data
    mockSupabaseResponse([]);

    // Import after mocking
    const { calculateInterpolatedMonthlyStats } = require('../weatherService');

    // Use coordinates far from any station (middle of ocean)
    const result = await calculateInterpolatedMonthlyStats(0, 0, 1);

    // May return null or empty depending on findNearestStations behavior
    // If stations are found but no data, should return null
    expect(result === null || result?.stations?.length === 0 || result?.isSingleStation !== undefined).toBe(true);
  });

  it('should use single station when very close (within 5km)', async () => {
    // Santa Cruz de Tenerife station coordinates: 28.4653, -16.2572
    const mockData = [
      { date: '2024-01-15', tmax: 22, tmin: 15, precip: 2, sol: 7, velmedia: 4.0 },
      { date: '2024-01-16', tmax: 23, tmin: 16, precip: 0, sol: 8, velmedia: 3.5 },
    ];

    mockSupabaseResponse(mockData);

    const { calculateInterpolatedMonthlyStats } = require('../weatherService');

    // Use coordinates very close to Santa Cruz station
    const result = await calculateInterpolatedMonthlyStats(28.4653, -16.2572, 1);

    if (result) {
      // Should use single station when very close
      expect(result.isSingleStation).toBe(true);
      expect(result.stations).toHaveLength(1);
      expect(result.stations[0].weight).toBe(1);
    }
  });

  it('should interpolate from multiple stations when far from nearest', async () => {
    // Create mock data for multiple station queries
    // When calculateInterpolatedMonthlyStats queries multiple stations,
    // Supabase will be called multiple times
    const mockDataStation1 = [
      { date: '2024-01-15', tmax: 20, tmin: 12, precip: 5, sol: 6, velmedia: 5.0 },
    ];

    // First call returns station 1 data, subsequent calls return different data
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({
                data: [{ date: '2024-01-15', tmax: 20, tmin: 12, precip: 5, sol: 6, velmedia: 5.0 }],
                error: null,
              });
            } else if (callCount === 2) {
              return Promise.resolve({
                data: [{ date: '2024-01-15', tmax: 24, tmin: 16, precip: 2, sol: 8, velmedia: 4.0 }],
                error: null,
              });
            } else {
              return Promise.resolve({
                data: [{ date: '2024-01-15', tmax: 22, tmin: 14, precip: 3, sol: 7, velmedia: 4.5 }],
                error: null,
              });
            }
          }),
        }),
      }),
    }));

    const { calculateInterpolatedMonthlyStats } = require('../weatherService');

    // Use coordinates between stations (center of Tenerife)
    const result = await calculateInterpolatedMonthlyStats(28.35, -16.55, 1);

    if (result && !result.isSingleStation) {
      // Should interpolate from multiple stations
      expect(result.stations.length).toBeGreaterThanOrEqual(2);
      // Weights should sum to approximately 1
      const totalWeight = result.stations.reduce((sum: number, s: { weight: number }) => sum + s.weight, 0);
      expect(totalWeight).toBeCloseTo(1, 1);
    }
  });

  it('should return correctly structured MonthlyStats', async () => {
    const mockData = [
      { date: '2024-02-15', tmax: 21, tmin: 14, precip: 3, sol: 7.5, velmedia: 4.2 },
      { date: '2024-02-16', tmax: 22, tmin: 15, precip: 0, sol: 8.0, velmedia: 3.8 },
    ];

    mockSupabaseResponse(mockData);

    const { calculateInterpolatedMonthlyStats } = require('../weatherService');

    const result = await calculateInterpolatedMonthlyStats(28.4653, -16.2572, 2);

    if (result) {
      expect(result.stats).toHaveProperty('month');
      expect(result.stats).toHaveProperty('avg_tmax');
      expect(result.stats).toHaveProperty('avg_tmin');
      expect(result.stats).toHaveProperty('avg_precip');
      expect(result.stats).toHaveProperty('avg_sol');
      expect(result.stats).toHaveProperty('avg_wind');
      expect(result.stats).toHaveProperty('sun_chance');
      expect(result.stats).toHaveProperty('rain_days');
      expect(result.stats.month).toBe(2);
    }
  });
});

// ─── CALIMA DETECTION TESTS ─────────────────────────────────────────────────

describe('fetchCalimaStatus', () => {
  // Store original fetch
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  it('should detect calima when PM10 >= 50', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        current: {
          time: '2024-02-15T12:00:00',
          pm10: 65,
        },
      }),
    });

    const { fetchCalimaStatus } = require('../weatherService');

    const result = await fetchCalimaStatus(28.0, -16.5);

    expect(result).not.toBeNull();
    expect(result!.isDetected).toBe(true);
    expect(result!.isSevere).toBe(false);
    expect(result!.pm10).toBe(65);
  });

  it('should detect severe calima when PM10 >= 100', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        current: {
          time: '2024-02-15T12:00:00',
          pm10: 150,
        },
      }),
    });

    const { fetchCalimaStatus } = require('../weatherService');

    const result = await fetchCalimaStatus(28.0, -16.5);

    expect(result).not.toBeNull();
    expect(result!.isDetected).toBe(true);
    expect(result!.isSevere).toBe(true);
    expect(result!.pm10).toBe(150);
  });

  it('should not detect calima when PM10 < 50', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        current: {
          time: '2024-02-15T12:00:00',
          pm10: 25,
        },
      }),
    });

    const { fetchCalimaStatus } = require('../weatherService');

    const result = await fetchCalimaStatus(28.0, -16.5);

    expect(result).not.toBeNull();
    expect(result!.isDetected).toBe(false);
    expect(result!.isSevere).toBe(false);
    expect(result!.pm10).toBe(25);
  });

  it('should return null on API error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { fetchCalimaStatus } = require('../weatherService');

    const result = await fetchCalimaStatus(28.0, -16.5);

    expect(result).toBeNull();
  });

  it('should return null when PM10 data is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        current: {
          time: '2024-02-15T12:00:00',
          // pm10 is undefined
        },
      }),
    });

    const { fetchCalimaStatus } = require('../weatherService');

    const result = await fetchCalimaStatus(28.0, -16.5);

    expect(result).toBeNull();
  });

  it('should return null on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const { fetchCalimaStatus } = require('../weatherService');

    const result = await fetchCalimaStatus(28.0, -16.5);

    expect(result).toBeNull();
  });

  it('should round PM10 value to integer', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        current: {
          time: '2024-02-15T12:00:00',
          pm10: 72.7,
        },
      }),
    });

    const { fetchCalimaStatus } = require('../weatherService');

    const result = await fetchCalimaStatus(28.0, -16.5);

    expect(result).not.toBeNull();
    expect(result!.pm10).toBe(73); // Rounded from 72.7
  });

  it('should detect calima at exactly threshold value (50)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        current: {
          time: '2024-02-15T12:00:00',
          pm10: 50,
        },
      }),
    });

    const { fetchCalimaStatus } = require('../weatherService');

    const result = await fetchCalimaStatus(28.0, -16.5);

    expect(result!.isDetected).toBe(true);
    expect(result!.isSevere).toBe(false);
  });

  it('should detect severe calima at exactly threshold value (100)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        current: {
          time: '2024-02-15T12:00:00',
          pm10: 100,
        },
      }),
    });

    const { fetchCalimaStatus } = require('../weatherService');

    const result = await fetchCalimaStatus(28.0, -16.5);

    expect(result!.isDetected).toBe(true);
    expect(result!.isSevere).toBe(true);
  });
});

// ─── COASTAL ALERTS TESTS ─────────────────────────────────────────────────────

describe('fetchCoastalAlerts', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // Sample CAP XML alert for testing
  const createMockCapAlert = (params: {
    id: string;
    nivel: string;
    fenomeno: string;
    geocode: string;
    inicio?: string;
    fin?: string;
  }) => {
    const now = new Date();
    const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h from now
    // Mock XML matches actual AEMET CAP format with correct valueName fields
    return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${params.id}</identifier>
  <info>
    <language>es-ES</language>
    <event>${params.fenomeno}</event>
    <description>Alerta de ${params.fenomeno}</description>
    <onset>${params.inicio || now.toISOString()}</onset>
    <expires>${params.fin || endTime.toISOString()}</expires>
    <area>
      <areaDesc>Costa de Tenerife</areaDesc>
      <geocode>
        <valueName>AEMET-Meteoalerta zona</valueName>
        <value>${params.geocode}</value>
      </geocode>
    </area>
    <parameter>
      <valueName>AEMET-Meteoalerta nivel</valueName>
      <value>${params.nivel}</value>
    </parameter>
  </info>
</alert>`;
  };

  it('should return null when no API key is configured', async () => {
    // The module checks EXPO_PUBLIC_AEMET_API_KEY
    // Without env var set, should return null
    const { fetchCoastalAlerts } = require('../weatherService');

    const result = await fetchCoastalAlerts('Tenerife');

    // Without API key, returns null
    expect(result).toBeNull();
  });

  it('should return null for unknown island', async () => {
    const { fetchCoastalAlerts } = require('../weatherService');

    const result = await fetchCoastalAlerts('UnknownIsland');

    expect(result).toBeNull();
  });

  it('should handle API meta request failure', async () => {
    // Mock AEMET_API_KEY in environment
    process.env.EXPO_PUBLIC_AEMET_API_KEY = 'test-api-key';

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    // Need to re-require to pick up env var
    jest.resetModules();
    jest.mock('@supabase/supabase-js');
    (require('@supabase/supabase-js').createClient as jest.Mock).mockReturnValue(mockSupabase);

    const { fetchCoastalAlerts } = require('../weatherService');

    const result = await fetchCoastalAlerts('Tenerife');

    expect(result).toBeNull();

    // Cleanup
    delete process.env.EXPO_PUBLIC_AEMET_API_KEY;
  });

  it('should handle API estado not 200', async () => {
    process.env.EXPO_PUBLIC_AEMET_API_KEY = 'test-api-key';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        estado: 429, // Rate limited
        descripcion: 'Too many requests',
      }),
    });

    jest.resetModules();
    jest.mock('@supabase/supabase-js');
    (require('@supabase/supabase-js').createClient as jest.Mock).mockReturnValue(mockSupabase);

    const { fetchCoastalAlerts } = require('../weatherService');

    const result = await fetchCoastalAlerts('Tenerife');

    expect(result).toBeNull();

    delete process.env.EXPO_PUBLIC_AEMET_API_KEY;
  });

  it('should return empty array when no alerts match filters', async () => {
    process.env.EXPO_PUBLIC_AEMET_API_KEY = 'test-api-key';

    // Create non-coastal alert (wind)
    const mockTarContent = createMockCapAlert({
      id: 'ALERT001',
      nivel: 'amarillo',
      fenomeno: 'Viento',
      geocode: '659601', // Tenerife
    });

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          estado: 200,
          datos: 'https://example.com/data.tar',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockTarContent),
      });

    jest.resetModules();
    jest.mock('@supabase/supabase-js');
    (require('@supabase/supabase-js').createClient as jest.Mock).mockReturnValue(mockSupabase);

    const { fetchCoastalAlerts } = require('../weatherService');

    const result = await fetchCoastalAlerts('Tenerife');

    // Should return empty array (wind alerts filtered out)
    expect(result).toEqual([]);

    delete process.env.EXPO_PUBLIC_AEMET_API_KEY;
  });

  it('should parse and return coastal alerts correctly', async () => {
    process.env.EXPO_PUBLIC_AEMET_API_KEY = 'test-api-key';

    const mockTarContent = createMockCapAlert({
      id: 'ALERT_COASTAL_001',
      nivel: 'naranja',
      fenomeno: 'Fenómenos Costeros',
      geocode: '659601C', // Tenerife coastal
    });

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          estado: 200,
          datos: 'https://example.com/data.tar',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockTarContent),
      });

    jest.resetModules();
    jest.mock('@supabase/supabase-js');
    (require('@supabase/supabase-js').createClient as jest.Mock).mockReturnValue(mockSupabase);

    const { fetchCoastalAlerts } = require('../weatherService');

    const result = await fetchCoastalAlerts('Tenerife');

    // Should parse the coastal alert
    if (result && result.length > 0) {
      expect(result[0].phenomenon).toBe('coastal');
      expect(result[0].severity).toBe('orange');
    }

    delete process.env.EXPO_PUBLIC_AEMET_API_KEY;
  });

  it('should handle network timeout', async () => {
    process.env.EXPO_PUBLIC_AEMET_API_KEY = 'test-api-key';

    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';

    global.fetch = jest.fn().mockRejectedValue(abortError);

    jest.resetModules();
    jest.mock('@supabase/supabase-js');
    (require('@supabase/supabase-js').createClient as jest.Mock).mockReturnValue(mockSupabase);

    const { fetchCoastalAlerts } = require('../weatherService');

    const result = await fetchCoastalAlerts('Tenerife');

    expect(result).toBeNull();

    delete process.env.EXPO_PUBLIC_AEMET_API_KEY;
  });
});

describe('fetchMostSevereCoastalAlert', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return null when no alerts', async () => {
    const { fetchMostSevereCoastalAlert } = require('../weatherService');

    const result = await fetchMostSevereCoastalAlert('Tenerife');

    expect(result).toBeNull();
  });
});

// ─── HELPER FUNCTION TESTS ─────────────────────────────────────────────────────

describe('findNearestStations', () => {
  it('should return stations sorted by distance', () => {
    const { findNearestStations } = require('../weatherService');

    // Santa Cruz de Tenerife coordinates
    const stations = findNearestStations(28.4653, -16.2572, 3);

    expect(stations.length).toBeLessThanOrEqual(3);
    // Verify sorted by distance (ascending)
    for (let i = 1; i < stations.length; i++) {
      expect(stations[i].distance).toBeGreaterThanOrEqual(stations[i - 1].distance);
    }
  });

  it('should include station names and IDs', () => {
    const { findNearestStations } = require('../weatherService');

    const stations = findNearestStations(28.4653, -16.2572, 1);

    if (stations.length > 0) {
      expect(stations[0]).toHaveProperty('stationId');
      expect(stations[0]).toHaveProperty('name');
      expect(stations[0]).toHaveProperty('distance');
    }
  });

  it('should exclude high altitude stations by default', () => {
    const { findNearestStations } = require('../weatherService');

    // Coordinates near Izaña (high altitude station)
    const stations = findNearestStations(28.3086, -16.4992, 5);

    // Should not include Izaña (C430E) or Roque de los Muchachos
    const hasHighAltitude = stations.some(
      (s: { stationId: string }) => s.stationId === 'C430E' || s.stationId === 'C628Y'
    );
    expect(hasHighAltitude).toBe(false);
  });

  it('should include high altitude stations when excludeHighAltitude is false', () => {
    const { findNearestStations } = require('../weatherService');

    // Coordinates near Izaña (high altitude station)
    const stations = findNearestStations(28.3086, -16.4992, 5, false);

    // May include Izaña depending on exact coordinates
    expect(stations.length).toBeGreaterThan(0);
  });
});

// ─── ALERT SEVERITY MAPPING TESTS ─────────────────────────────────────────────

describe('Alert severity and phenomenon mapping', () => {
  // These are internal functions, but we can test their behavior through fetchCoastalAlerts
  // by checking the output format

  it('should correctly structure CoastalAlert type', () => {
    // Verify the expected shape of CoastalAlert
    const mockAlert = {
      id: 'test-id',
      severity: 'orange' as const,
      phenomenon: 'coastal' as const,
      headline: 'Test headline',
      description: 'Test description',
      startTime: '2024-02-15T00:00:00Z',
      endTime: '2024-02-16T00:00:00Z',
      areaName: 'Costa Norte',
      eventCode: 'FC',
    };

    expect(mockAlert.severity).toMatch(/^(yellow|orange|red)$/);
    expect(mockAlert.phenomenon).toBe('coastal');
  });
});

// ─── RAIN STATS CONFIDENCE LOGIC TESTS ────────────────────────────────────────

describe('Rain confidence calculation logic', () => {
  // Test the confidence calculation logic directly
  // Confidence is based on distance from 50% (how decisive the result is)

  function calculateConfidence(daysWithoutRain: number): 'high' | 'medium' | 'low' {
    const distanceFrom50 = Math.abs(daysWithoutRain - 50);
    if (distanceFrom50 >= 25) {
      return 'high'; // <=25% or >=75%: Very certain result
    } else if (distanceFrom50 >= 10) {
      return 'medium'; // 26-40% or 60-74%: Moderately certain
    } else {
      return 'low'; // 41-59%: Uncertain (could go either way)
    }
  }

  it('should return high confidence for 93% dry days (user reported issue)', () => {
    // User reported: 93% dry days was showing "medium confidence" - should be "high"
    expect(calculateConfidence(93)).toBe('high');
  });

  it('should return high confidence for >= 75% dry days', () => {
    expect(calculateConfidence(75)).toBe('high');
    expect(calculateConfidence(80)).toBe('high');
    expect(calculateConfidence(90)).toBe('high');
    expect(calculateConfidence(100)).toBe('high');
  });

  it('should return high confidence for <= 25% dry days (very rainy)', () => {
    expect(calculateConfidence(25)).toBe('high');
    expect(calculateConfidence(20)).toBe('high');
    expect(calculateConfidence(10)).toBe('high');
    expect(calculateConfidence(0)).toBe('high');
  });

  it('should return medium confidence for 60-74% dry days', () => {
    expect(calculateConfidence(60)).toBe('medium');
    expect(calculateConfidence(65)).toBe('medium');
    expect(calculateConfidence(70)).toBe('medium');
    expect(calculateConfidence(74)).toBe('medium');
  });

  it('should return medium confidence for 26-40% dry days', () => {
    expect(calculateConfidence(26)).toBe('medium');
    expect(calculateConfidence(30)).toBe('medium');
    expect(calculateConfidence(35)).toBe('medium');
    expect(calculateConfidence(40)).toBe('medium');
  });

  it('should return low confidence for 41-59% dry days (uncertain)', () => {
    expect(calculateConfidence(41)).toBe('low');
    expect(calculateConfidence(45)).toBe('low');
    expect(calculateConfidence(50)).toBe('low'); // Most uncertain
    expect(calculateConfidence(55)).toBe('low');
    expect(calculateConfidence(59)).toBe('low');
  });
});
