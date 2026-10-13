const SKILL_NAMES = {
  'ai': 'AI',
  'algo': 'Algorithms',
  'back-end': 'Back-end',
  'c': 'C',
  'css': 'CSS',
  'docker': 'Docker',
  'front-end': 'Front-end',
  'game': 'Game',
  'go': 'Go',
  'html': 'HTML',
  'java': 'Java',
  'js': 'JavaScript',
  'prog': 'Programming',
  'python': 'Python',
  'rust': 'Rust',
  'sql': 'SQL',
  'stats': 'Statistics',
  'sys-admin': 'Sys admin',
  'tcp': 'TCP',
  'unix': 'Unix',
}

export function lastSegment(path = '') {
  return path.split('/').filter(Boolean).pop() ?? ''
}

export function commonPath(paths) {
  const parts = paths.map(path => path.split('/'))
  const first = parts[0] ?? []
  let length = first.length
  for (const other of parts) {
    let i = 0
    while (i < length && other[i] === first[i]) i++
    length = i
  }
  return first.slice(0, length).join('/') || '/'
}

export function groupByEvent(transactions) {
  const groups = new Map()
  for (const transaction of transactions) {
    if (!groups.has(transaction.eventId)) {
      groups.set(transaction.eventId, { eventId: transaction.eventId, amount: 0, transactions: [], event: null })
    }
    const group = groups.get(transaction.eventId)
    group.amount += transaction.amount
    group.transactions.push(transaction)
  }
  for (const group of groups.values()) group.path = commonPath(group.transactions.map(t => t.path))
  return [...groups.values()]
}

export function eventName(group) {
  return group.event?.object?.name || lastSegment(group.event?.path ?? group.path) || 'Unknown event'
}

function isPiscine(group) {
  return group.event?.object?.type === 'piscine' || /piscine/i.test(group.event?.path ?? group.path)
}

export function pickMainEvent(groups) {
  const modules = groups.filter(group => group.event?.object?.type === 'module')
  const regular = groups.filter(group => !isPiscine(group))
  const candidates = modules.length ? modules : regular.length ? regular : groups
  return candidates.reduce((best, group) => (!best || group.amount > best.amount ? group : best), null)
}

export function timeline(transactions) {
  let total = 0
  return transactions.map(transaction => {
    total += transaction.amount
    return {
      date: new Date(transaction.createdAt),
      amount: transaction.amount,
      total,
      name: transaction.object?.name ?? lastSegment(transaction.path),
    }
  })
}

export function xpBySource(transactions, limit = 10) {
  const projects = transactions.filter(t => ['project', 'raid'].includes(t.object?.type))
  const source = projects.length ? projects : transactions
  const totals = new Map()
  for (const transaction of source) {
    const name = transaction.object?.name ?? lastSegment(transaction.path)
    totals.set(name, (totals.get(name) ?? 0) + transaction.amount)
  }
  return [...totals]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

export function skillLevels(transactions) {
  const best = new Map()
  for (const { type, amount } of transactions) {
    const key = type.replace(/^skill_/, '')
    best.set(key, Math.max(best.get(key) ?? 0, amount))
  }
  return [...best]
    .map(([key, value]) => ({ name: SKILL_NAMES[key] ?? key, value }))
    .sort((a, b) => b.value - a.value)
}

export function projectSummary(progress) {
  const latest = new Map()
  let passedAttempts = 0
  let failedAttempts = 0
  for (const entry of progress) {
    const name = entry.object?.name ?? lastSegment(entry.path)
    if (!latest.has(name)) latest.set(name, entry)
    if (entry.grade === null) continue
    if (entry.grade >= 1) passedAttempts++
    else failedAttempts++
  }
  const projects = [...latest.values()]
  return {
    passed: projects.filter(p => p.grade !== null && p.grade >= 1).length,
    failed: projects.filter(p => p.grade !== null && p.grade < 1).length,
    ongoing: projects.filter(p => p.grade === null).length,
    passedAttempts,
    failedAttempts,
  }
}

export function auditSummary(audits) {
  const passed = audits.filter(audit => audit.grade >= 1).length
  return { count: audits.length, passed, failed: audits.length - passed }
}

export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('')
}
