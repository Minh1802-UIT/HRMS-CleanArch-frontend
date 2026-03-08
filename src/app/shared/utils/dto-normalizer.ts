/**
 * DTO Normalization Utility
 * 
 * Handles inconsistent API response casing (e.g., departmentName vs DepartmentName)
 * by normalizing all properties to camelCase.
 */

type DeepObject = Record<string, unknown>;

/**
 * Normalizes API response objects to camelCase property names
 * Handles nested objects and arrays recursively
 * 
 * @param data - The API response data to normalize
 * @returns Normalized data with camelCase properties
 * 
 * @example
 * // Backend returns: { "DepartmentName": "IT", "employeeId": "123" }
 * // Normalized to:   { "departmentName": "IT", "employeeId": "123" }
 */
export function normalizeDto<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => normalizeDto(item)) as T;
  }

  if (typeof data === 'object') {
    return normalizeObject(data as DeepObject) as T;
  }

  return data;
}

/**
 * Recursively normalizes an object to camelCase keys
 */
function normalizeObject(obj: DeepObject): DeepObject {
  const result: DeepObject = {};

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);

    if (value === null || value === undefined) {
      result[camelKey] = value;
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map(item => 
        typeof item === 'object' && item !== null 
          ? normalizeObject(item as DeepObject) 
          : item
      );
    } else if (typeof value === 'object') {
      result[camelKey] = normalizeObject(value as DeepObject);
    } else {
      result[camelKey] = value;
    }
  }

  return result;
}

/**
 * Converts a string to camelCase
 */
function toCamelCase(str: string): string {
  // Already camelCase - return as is
  if (str[0] === str[0].toLowerCase() && !str.includes('_')) {
    return str;
  }

  return str
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * Creates a normalized version of an API response
 * Use this in services to ensure consistent property naming
 */
export function normalizeApiResponse<T>(response: { data?: T }): { data?: T } {
  if (!response?.data) {
    return response;
  }

  return {
    ...response,
    data: normalizeDto(response.data)
  };
}

/**
 * Type-safe DTO normalization with mapping
 * Use when you need to transform and validate at the same time
 * 
 * @param data - Raw API data
 * @param mapper - Function to map normalized data to final type
 * @returns Mapped and normalized data
 * 
 * @example
 * const employee = mapDto(rawData, (d) => ({
 *   id: d.id,
 *   name: d.fullName || d.FullName,
 *   deptId: d.jobDetails?.departmentId
 * }));
 */
export function mapDto<TInput, TOutput>(
  data: TInput, 
  mapper: (normalized: TInput) => TOutput
): TOutput {
  const normalized = normalizeDto(data);
  return mapper(normalized);
}
