/**
 * Formats a date string or Date object in local Ecuadorian format (es-EC)
 * without triggering timezone shifts (which can make the date display one day prior).
 */
export function formatLocalDateSimple(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const cleanStr = String(dateInput).split('T')[0].split(' ')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('es-EC');
    }
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-EC');
  } catch (e) {
    return '—';
  }
}
