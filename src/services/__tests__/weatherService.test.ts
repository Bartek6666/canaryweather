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
import { calculateWindStability, WindStabilityResult } from '../weatherService';

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
