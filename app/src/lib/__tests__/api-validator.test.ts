/**
 * Unit tests for API validation utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  validateApiResponse,
  safeValidateApiResponse,
  validateArrayItems,
  ApiValidationError,
  formatZodIssues,
} from '../api-validator';
import { log, LogLevel } from '../logger';

// Mock the logger
vi.mock('../logger', () => ({
  log: {
    error: vi.fn(),
    warn: vi.fn(),
    api: vi.fn(),
  },
  LogLevel: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4,
  },
}));

// Test schemas
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional(),
});

const MonitorSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  Enabled: z.string(),
});

const SimpleStringSchema = z.string();
const SimpleNumberSchema = z.number();

describe('ApiValidationError', () => {
  it('creates error with all required properties', () => {
    const zodError = new z.ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['name'],
        message: 'Expected string, received number',
      } as any,
    ]);

    const rawData = { name: 123 };
    const zFormat = formatZodIssues(zodError.issues);
    const error = new ApiValidationError('Test error', zodError, zFormat, rawData);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiValidationError);
    expect(error.name).toBe('ApiValidationError');
    expect(error.message).toBe('Test error');
    expect(error.zodError).toBe(zodError);
    expect(error.rawData).toBe(rawData);
  });

  it('has correct prototype chain', () => {
    const zodError = new z.ZodError([]);
    const zFormat = formatZodIssues(zodError.issues);
    const error = new ApiValidationError('Test', zodError,zFormat, {});

    expect(error instanceof Error).toBe(true);
    expect(error instanceof ApiValidationError).toBe(true);
  });
});

describe('validateApiResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success cases', () => {
    it('validates and returns valid data', () => {
      const validData = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = validateApiResponse(UserSchema, validData);

      expect(result).toEqual(validData);
    });

    it('validates data with optional fields', () => {
      const validData = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };

      const result = validateApiResponse(UserSchema, validData);

      expect(result).toEqual(validData);
    });

    it('validates data without optional fields', () => {
      const validData = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = validateApiResponse(UserSchema, validData);

      expect(result).toEqual(validData);
    });

    it('validates simple string schema', () => {
      const result = validateApiResponse(SimpleStringSchema, 'hello');

      expect(result).toBe('hello');
    });

    it('validates simple number schema', () => {
      const result = validateApiResponse(SimpleNumberSchema, 42);

      expect(result).toBe(42);
    });

    it('validates monitor schema', () => {
      const monitor = {
        Id: '1',
        Name: 'Front Door',
        Enabled: '1',
      };

      const result = validateApiResponse(MonitorSchema, monitor);

      expect(result).toEqual(monitor);
    });
  });

  describe('Failure cases', () => {
    it('throws ApiValidationError for invalid data', () => {
      const invalidData = {
        id: '123',
        name: 'John Doe',
        email: 'not-an-email',
      };

      expect(() => {
        validateApiResponse(UserSchema, invalidData);
      }).toThrow(ApiValidationError);
    });

    it('includes endpoint in error message', () => {
      const invalidData = { id: 123 };

      expect(() => {
        validateApiResponse(UserSchema, invalidData, { endpoint: '/api/users' });
      }).toThrow('API response validation failed for /api/users');
    });

    it('includes "unknown endpoint" when no context provided', () => {
      const invalidData = { id: 123 };

      expect(() => {
        validateApiResponse(UserSchema, invalidData);
      }).toThrow('API response validation failed for unknown endpoint');
    });

    it('throws error with zodError property', () => {
      const invalidData = {
        id: '123',
        name: 'John Doe',
        email: 'not-an-email',
      };

      try {
        validateApiResponse(UserSchema, invalidData);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiValidationError);
        if (error instanceof ApiValidationError) {
          expect(error.zodError).toBeDefined();
          expect(error.zodError.issues).toHaveLength(1);
          expect(error.zodError.issues[0].path).toEqual(['email']);
        }
      }
    });

    it('throws error with rawData property', () => {
      const invalidData = {
        id: '123',
        name: 'John Doe',
        email: 'not-an-email',
      };

      try {
        validateApiResponse(UserSchema, invalidData);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiValidationError);
        if (error instanceof ApiValidationError) {
          expect(error.rawData).toBe(invalidData);
        }
      }
    });

    it('throws for missing required field', () => {
      const invalidData = {
        id: '123',
        email: 'john@example.com',
        // missing 'name'
      };

      expect(() => {
        validateApiResponse(UserSchema, invalidData);
      }).toThrow(ApiValidationError);
    });

    it('throws for wrong type', () => {
      const invalidData = {
        id: 123, // should be string
        name: 'John Doe',
        email: 'john@example.com',
      };

      expect(() => {
        validateApiResponse(UserSchema, invalidData);
      }).toThrow(ApiValidationError);
    });

    it('throws for null when object expected', () => {
      expect(() => {
        validateApiResponse(UserSchema, null);
      }).toThrow(ApiValidationError);
    });

    it('throws for undefined when object expected', () => {
      expect(() => {
        validateApiResponse(UserSchema, undefined);
      }).toThrow(ApiValidationError);
    });

    it('re-throws non-ZodError errors', () => {
      const schema = z.string().transform(() => {
        throw new Error('Custom error');
      });

      expect(() => {
        validateApiResponse(schema, 'test');
      }).toThrow('Custom error');
    });
  });

  describe('Context logging', () => {
    it('includes endpoint in log context', () => {
      const invalidData = { id: 123 };

      try {
        validateApiResponse(UserSchema, invalidData, { endpoint: '/api/users' });
      } catch {
        // Expected to throw
      }

      expect(log.api).toHaveBeenCalledWith(
        'API response validation failed',
        LogLevel.ERROR,
        expect.objectContaining({
          endpoint: '/api/users',
        })
      );
    });

    it('includes method in log context', () => {
      const invalidData = { id: 123 };

      try {
        validateApiResponse(UserSchema, invalidData, { method: 'GET' });
      } catch {
        // Expected to throw
      }

      expect(log.api).toHaveBeenCalledWith(
        'API response validation failed',
        LogLevel.ERROR,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });
});

describe('safeValidateApiResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success cases', () => {
    it('returns validated data for valid input', () => {
      const validData = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = safeValidateApiResponse(UserSchema, validData);

      expect(result).toEqual(validData);
    });

    it('returns validated data with optional fields', () => {
      const validData = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };

      const result = safeValidateApiResponse(UserSchema, validData);

      expect(result).toEqual(validData);
    });
  });

  describe('Failure cases', () => {
    it('returns null for invalid data instead of throwing', () => {
      const invalidData = {
        id: '123',
        name: 'John Doe',
        email: 'not-an-email',
      };

      const result = safeValidateApiResponse(UserSchema, invalidData);

      expect(result).toBeNull();
    });

    it('returns null for missing required field', () => {
      const invalidData = {
        id: '123',
        email: 'john@example.com',
        // missing 'name'
      };

      const result = safeValidateApiResponse(UserSchema, invalidData);

      expect(result).toBeNull();
    });

    it('returns null for wrong type', () => {
      const invalidData = {
        id: 123, // should be string
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = safeValidateApiResponse(UserSchema, invalidData);

      expect(result).toBeNull();
    });

    it('returns null for null input', () => {
      const result = safeValidateApiResponse(UserSchema, null);

      expect(result).toBeNull();
    });

    it('returns null for undefined input', () => {
      const result = safeValidateApiResponse(UserSchema, undefined);

      expect(result).toBeNull();
    });

    it('re-throws non-ApiValidationError errors', () => {
      const schema = z.string().transform(() => {
        throw new Error('Custom error');
      });

      expect(() => {
        safeValidateApiResponse(schema, 'test');
      }).toThrow('Custom error');
    });
  });

  describe('Context handling', () => {
    it('passes context to validateApiResponse', () => {
      const invalidData = { id: 123 };

      safeValidateApiResponse(UserSchema, invalidData, { endpoint: '/api/users' });

      expect(log.api).toHaveBeenCalledWith(
        'API response validation failed',
        LogLevel.ERROR,
        expect.objectContaining({
          endpoint: '/api/users',
        })
      );
    });
  });
});

describe('validateArrayItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success cases', () => {
    it('validates all items in valid array', () => {
      const validData = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: '2', name: 'Jane', email: 'jane@example.com' },
        { id: '3', name: 'Bob', email: 'bob@example.com' },
      ];

      const result = validateArrayItems(UserSchema, validData);

      expect(result).toEqual(validData);
      expect(result).toHaveLength(3);
    });

    it('handles empty array', () => {
      const result = validateArrayItems(UserSchema, []);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('validates array with optional fields', () => {
      const validData = [
        { id: '1', name: 'John', email: 'john@example.com', age: 30 },
        { id: '2', name: 'Jane', email: 'jane@example.com' },
      ];

      const result = validateArrayItems(UserSchema, validData);

      expect(result).toEqual(validData);
    });
  });

  describe('Partial validation', () => {
    it('filters out invalid items and returns valid ones', () => {
      const mixedData = [
        { id: '1', name: 'John', email: 'john@example.com' }, // valid
        { id: 2, name: 'Jane', email: 'jane@example.com' },   // invalid (id is number)
        { id: '3', name: 'Bob', email: 'bob@example.com' },   // valid
      ];

      const result = validateArrayItems(UserSchema, mixedData);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mixedData[0]);
      expect(result[1]).toEqual(mixedData[2]);
    });

    it('returns empty array when all items are invalid', () => {
      const invalidData = [
        { id: 1, name: 'John' }, // missing email, wrong id type
        { id: 2, name: 'Jane' }, // missing email, wrong id type
      ];

      const result = validateArrayItems(UserSchema, invalidData);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('logs warning when some items fail', () => {
      const mixedData = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'invalid' },
      ];

      validateArrayItems(UserSchema, mixedData);

      expect(log.api).toHaveBeenCalledWith(
        'Some array items failed validation',
        LogLevel.WARN,
        expect.objectContaining({
          failedCount: 1,
          totalCount: 2,
        })
      );
    });

    it('includes error details in warning log', () => {
      const mixedData = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'invalid' },
      ];

      validateArrayItems(UserSchema, mixedData);

      expect(log.api).toHaveBeenCalledWith(
        'Some array items failed validation',
        LogLevel.WARN,
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              index: 1,
              issues: expect.any(Array),
            }),
          ]),
        })
      );
    });
  });

  describe('Edge cases', () => {
    it('returns empty array for non-array input', () => {
      const notAnArray = { id: '1', name: 'John', email: 'john@example.com' };

      const result = validateArrayItems(UserSchema, notAnArray as any);

      expect(result).toEqual([]);
    });

    it('logs error for non-array input', () => {
      const notAnArray = { id: '1', name: 'John' };

      validateArrayItems(UserSchema, notAnArray as any);

      expect(log.api).toHaveBeenCalledWith(
        'Expected array for validation',
        LogLevel.ERROR,
        expect.objectContaining({
          dataType: 'object',
        })
      );
    });

    it('handles array with null items', () => {
      const dataWithNull = [
        { id: '1', name: 'John', email: 'john@example.com' },
        null,
        { id: '3', name: 'Bob', email: 'bob@example.com' },
      ];

      const result = validateArrayItems(UserSchema, dataWithNull);

      // null should be filtered out as invalid
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });

    it('handles array with undefined items', () => {
      const dataWithUndefined = [
        { id: '1', name: 'John', email: 'john@example.com' },
        undefined,
        { id: '3', name: 'Bob', email: 'bob@example.com' },
      ];

      const result = validateArrayItems(UserSchema, dataWithUndefined);

      // undefined should be filtered out as invalid
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });
  });

  describe('Context handling', () => {
    it('includes context in error log for non-array', () => {
      validateArrayItems(UserSchema, {} as any, { endpoint: '/api/users' });

      expect(log.api).toHaveBeenCalledWith(
        'Expected array for validation',
        LogLevel.ERROR,
        expect.objectContaining({
          endpoint: '/api/users',
        })
      );
    });

    it('includes context in warning log for invalid items', () => {
      const mixedData = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'invalid' },
      ];

      validateArrayItems(UserSchema, mixedData, {
        endpoint: '/api/users',
        method: 'GET',
      });

      expect(log.api).toHaveBeenCalledWith(
        'Some array items failed validation',
        LogLevel.WARN,
        expect.objectContaining({
          endpoint: '/api/users',
          method: 'GET',
        })
      );
    });
  });
});
