const LOCALES = { en: 'en-US', fr: 'fr-FR', es: 'es-ES' }

export function localeFor(lang) {
  return LOCALES[(lang || 'en').slice(0, 2)] || 'en-US'
}

export function makeDateFmt(lang) {
  const loc = localeFor(lang)
  return {
    time: (d) => d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }),
    dayHour: (d) => d.toLocaleDateString(loc, { weekday: 'short', hour: '2-digit' }),
    dayMonth: (d) => d.toLocaleDateString(loc, { month: 'short', day: 'numeric' }),
    dayMonthHour: (d) => d.toLocaleString(loc, { month: 'short', day: 'numeric', hour: '2-digit' }),
    monthYear: (d) => d.toLocaleDateString(loc, { month: 'short', year: '2-digit' }),
    dayMonthYear: (d) => d.toLocaleDateString(loc, { year: '2-digit', month: 'short', day: 'numeric' }),
    full: (d) => d.toLocaleString(loc, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
  }
}
