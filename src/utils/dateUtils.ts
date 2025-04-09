const frenchMonths: { [key: string]: number } = {
  'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
  'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
};

/**
 * Parses a French date string like "jour mois année" (e.g., "mardi 8 avril 2025").
 * Ignores the day name.
 * Returns a Date object or null if parsing fails.
 */
export const parseFrenchDate = (dateString: string | undefined | null): Date | null => {
  if (!dateString) {
    return null;
  }

  const parts = dateString.toLowerCase().split(' ');
  // Expected format: [dayName, dayNumber, monthName, yearNumber]
  // We only need dayNumber, monthName, yearNumber
  if (parts.length < 3) {
      console.warn(`[parseFrenchDate] Unexpected date format: "${dateString}"`);
      return null; // Not enough parts
  }

  // Try to find the month name and year, assuming they are the last two relevant parts
  const yearStr = parts[parts.length - 1];
  const monthStr = parts[parts.length - 2];
  const dayStr = parts[parts.length - 3]; // Assume day number is before month

  const day = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);
  const monthIndex = frenchMonths[monthStr];

  if (isNaN(day) || isNaN(year) || monthIndex === undefined) {
    console.warn(`[parseFrenchDate] Failed to parse date components: day=${dayStr}, month=${monthStr}, year=${yearStr} from "${dateString}"`);
    // Fallback attempt: Maybe format is DD/MM/YYYY or YYYY-MM-DD
    try {
        const parsedDate = new Date(dateString);
        // Check if the parsed date is valid
        if (!isNaN(parsedDate.getTime())) {
            console.log(`[parseFrenchDate] Fallback parsing successful for "${dateString}"`);
            return parsedDate;
        }
    } catch (e) {
        // Ignore fallback error
    }
    return null; // Parsing failed
  }

  // Create Date object (month is 0-indexed)
  try {
      const date = new Date(Date.UTC(year, monthIndex, day));
      // Basic validation: Check if the components match after creation
      if (date.getUTCFullYear() === year && date.getUTCMonth() === monthIndex && date.getUTCDate() === day) {
          return date;
      } else {
          console.warn(`[parseFrenchDate] Date object creation resulted in mismatch for "${dateString}"`);
          return null;
      }
  } catch (e) {
      console.error(`[parseFrenchDate] Error creating Date object for "${dateString}":`, e);
      return null;
  }
};


/**
 * Formats a Date object into DD/MM/YYYY string.
 */
export const formatDateForDisplay = (date: Date | null): string => {
  if (!date || isNaN(date.getTime())) {
    return 'N/A';
  }
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};


// Original formatDate function (might be used elsewhere)
export const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};
