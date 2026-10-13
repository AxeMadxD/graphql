const numberFormat = new Intl.NumberFormat('en-US')
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' })

export function formatXp(amount) {
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)} MB`
  if (amount >= 1e5) return `${Math.round(amount / 1e3)} kB`
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)} kB`
  return `${Math.round(amount)} B`
}

export function formatNumber(value) {
  return numberFormat.format(value)
}

export function formatRatio(ratio) {
  return Number.isFinite(ratio) ? ratio.toFixed(1) : '—'
}

export function formatDate(value) {
  return value ? dateFormat.format(new Date(value)) : '—'
}

export function formatMonth(value) {
  return monthFormat.format(new Date(value))
}

export function titleCase(text) {
  return text.replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}
