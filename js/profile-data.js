import { query } from './api.js'
import {
  AUDITS_QUERY,
  EVENTS_QUERY,
  EVENT_LEVEL_QUERY,
  LEVEL_QUERY,
  PROJECTS_QUERY,
  SKILLS_QUERY,
  USER_QUERY,
  XP_QUERY,
} from './queries.js'
import {
  auditSummary,
  eventName,
  groupByEvent,
  pickMainEvent,
  projectSummary,
  skillLevels,
  timeline,
  xpBySource,
} from './stats.js'

async function optional(promise) {
  try {
    return await promise
  } catch (error) {
    if (error.expired) throw error
    return null
  }
}

async function loadLevel(token, userId, eventId) {
  const fromTransactions = await optional(query(token, LEVEL_QUERY, { userId, eventId }))
  const level = fromTransactions?.transaction?.[0]?.amount
  if (level !== undefined) return level
  const fromEvent = await optional(query(token, EVENT_LEVEL_QUERY, { userId, eventId }))
  return fromEvent?.event_user?.[0]?.level ?? null
}

function describeUser(user) {
  const attrs = user.attrs ?? {}
  const name = [attrs.firstName, attrs.lastName].filter(Boolean).join(' ')
  return {
    id: user.id,
    login: user.login,
    name: name || user.login,
    email: attrs.email ?? null,
    campus: user.campus ?? null,
    joined: user.createdAt,
  }
}

export async function loadProfile(token) {
  const { user: users } = await query(token, USER_QUERY)
  const user = users?.[0]
  if (!user) throw new Error('No profile data was returned for this account.')
  const userId = user.id

  const [{ transaction: xp }, skills, projects, audits] = await Promise.all([
    query(token, XP_QUERY, { userId }),
    optional(query(token, SKILLS_QUERY, { userId })),
    optional(query(token, PROJECTS_QUERY, { userId })),
    optional(query(token, AUDITS_QUERY, { userId })),
  ])

  const groups = groupByEvent(xp)
  const ids = groups.map(group => group.eventId).filter(id => id !== null)
  const events = ids.length ? await optional(query(token, EVENTS_QUERY, { ids })) : null
  for (const group of groups) group.event = events?.event?.find(event => event.id === group.eventId) ?? null

  const main = pickMainEvent(groups)
  const level = main ? await loadLevel(token, userId, main.eventId) : null
  const moduleXp = main?.transactions ?? []

  return {
    user: describeUser(user),
    xp: {
      total: main?.amount ?? 0,
      event: main ? eventName(main) : null,
      eventId: main?.eventId ?? null,
      eventPath: main ? main.event?.path ?? main.path : null,
      level,
      last: moduleXp.findLast(t => ['project', 'raid'].includes(t.object?.type)) ?? moduleXp.at(-1) ?? null,
      timeline: timeline(moduleXp),
      sources: xpBySource(moduleXp),
      events: groups
        .map(group => ({ name: eventName(group), amount: group.amount, main: group === main }))
        .sort((a, b) => b.amount - a.amount),
      recent: [...xp].reverse().slice(0, 8),
    },
    audits: {
      ratio: user.auditRatio,
      done: user.totalUp ?? 0,
      received: user.totalDown ?? 0,
      ...(audits ? auditSummary(audits.audit) : { count: null }),
    },
    skills: skills ? skillLevels(skills.transaction) : null,
    projects: projects ? projectSummary(projects.progress) : null,
  }
}
