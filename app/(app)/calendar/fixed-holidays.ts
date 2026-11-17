/**
 * Holidays and special non-working holidays that fall on the same date every year
 */
export const FIXED_HOLIDAYS: Record<string, string> = {
  "01-01": "New Year's Day",
  "02-25": "EDSA People Power Revolution Anniversary",
  "04-09": "Araw ng Kagitingan (Day of Valor)",
  "05-01": "Labor Day",
  "06-12": "Independence Day",
  "08-21": "Ninoy Aquino Day",
  "09-08": "Feast of the Nativity of the Blessed Virgin Mary",
  "11-01": "All Saints' Day",
  "11-02": "All Souls' Day",
  "11-30": "Bonifacio Day",
  "12-08": "Feast of the Immaculate Conception",
  "12-24": "Christmas Eve",
  "12-25": "Christmas Day",
  "12-30": "Rizal Day",
  "12-31": "New Year's Eve",
};

/** The fixed holiday's name for a YYYY-MM-DD date, or null. */
export const fixedHolidayName = (date: string): string | null => FIXED_HOLIDAYS[date.slice(5, 10)] ?? null;
