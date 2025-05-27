export function getStringFieldsWithUniqueValues(dataArray: Record<string, any>[]): Record<string, string[]> {
  const stringFieldsMap: Record<string, Set<string>> = {};

  for (const obj of dataArray) {
    for (const key in obj) {
      const value = obj[key];
      if (typeof value === 'string') {
        if (!stringFieldsMap[key]) {
          stringFieldsMap[key] = new Set();
        }
        stringFieldsMap[key].add(value);
      }
    }
  }

  // Convert Set to array for the final output
  const result: Record<string, string[]> = {};
  for (const key in stringFieldsMap) {
    result[key] = Array.from(stringFieldsMap[key]);
  }

  return result;
}