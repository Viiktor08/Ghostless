function formatOffset(minutesWest) {
  const minutes = -minutesWest;
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

// Fecha fija para que los formatos solo dependan del navegador, no del momento.
const SAMPLE_DATE = new Date(Date.UTC(2024, 0, 2, 15, 4, 5));

export default [
  {
    id: 'timezone',
    category: 'locale',
    name: 'Zona horaria',
    run() {
      if (typeof Intl === 'undefined') return { supported: false };
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
      const now = new Date().getTimezoneOffset();
      // Enero y julio en vez de "ahora": el cambio de hora no altera la huella.
      const year = new Date().getFullYear();
      const offsets = [new Date(year, 0, 1).getTimezoneOffset(), new Date(year, 6, 1).getTimezoneOffset()];
      const dst = offsets[0] !== offsets[1] ? ' · con horario de verano' : '';
      const value = `${timeZone ?? 'desconocida'} (${formatOffset(now)})${dst}`;
      return { supported: true, value, raw: { timeZone, offsets } };
    },
  },
  {
    id: 'intlLocale',
    category: 'locale',
    name: 'Configuración regional',
    run() {
      if (typeof Intl === 'undefined') return { supported: false };
      const dt = Intl.DateTimeFormat().resolvedOptions();
      const raw = {
        locale: dt.locale,
        calendar: dt.calendar,
        numberingSystem: dt.numberingSystem,
        hourCycle: new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle ?? null,
        numberLocale: new Intl.NumberFormat().resolvedOptions().locale,
        collatorLocale: new Intl.Collator().resolvedOptions().locale,
      };
      const clock = raw.hourCycle === 'h23' || raw.hourCycle === 'h24' ? 'reloj 24 h' : 'reloj 12 h';
      const value = `${raw.locale} · calendario ${raw.calendar} · números ${raw.numberingSystem} · ${clock}`;
      return { supported: true, value, raw };
    },
  },
  {
    id: 'intlFormats',
    category: 'locale',
    name: 'Formatos de fecha y número',
    run() {
      if (typeof Intl === 'undefined') return { supported: false };
      const safe = (fn) => {
        try {
          return fn();
        } catch {
          return null;
        }
      };
      const raw = {
        date: safe(() => new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'long', timeZone: 'UTC' }).format(SAMPLE_DATE)),
        number: safe(() => new Intl.NumberFormat().format(1234567.891)),
        currency: safe(() => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(-1234.5)),
        compact: safe(() => new Intl.NumberFormat(undefined, { notation: 'compact' }).format(98765)),
        relative: safe(() => new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-1, 'day')),
        list: safe(() => new Intl.ListFormat(undefined, { type: 'conjunction' }).format(['A', 'B', 'C'])),
        plural: safe(() => new Intl.PluralRules().select(1)),
        sorted: safe(() => ['ñ', 'n', 'o', 'Z', 'a', 'á'].sort(new Intl.Collator().compare).join('')),
        legacy: SAMPLE_DATE.toLocaleString(undefined, { timeZone: 'UTC' }),
      };
      const value = [raw.number, raw.currency, raw.date].filter(Boolean).join(' · ');
      return { supported: true, value, raw };
    },
  },
];
