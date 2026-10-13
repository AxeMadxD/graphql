import { barChart } from '../charts/bars.js'
import { donutChart } from '../charts/donut.js'
import { radarChart } from '../charts/radar.js'
import { timelineChart } from '../charts/timeline.js'
import { create, fill, fromTemplate } from '../dom.js'
import { formatDate, formatNumber, formatRatio, formatXp } from '../format.js'
import { loadProfile } from '../profile-data.js'
import { session } from '../session.js'
import { initials, lastSegment } from '../stats.js'

function fillIdentity(root, user) {
  fill(root, {
    initials: initials(user.name),
    name: user.name,
    login: `@${user.login}`,
    id: user.id,
    email: user.email ?? '—',
    campus: user.campus ?? '—',
    joined: formatDate(user.joined),
  })
}

function fillXp(root, { xp, projects }) {
  const last = xp.last
  fill(root, {
    'xp-total': formatXp(xp.total),
    'xp-caption': xp.event ? `${formatNumber(xp.total)} XP in ${xp.event}` : 'No XP yet',
    'level': xp.level ?? '—',
    'projects-passed': projects ? projects.passed : '—',
    'last-project': last ? `${last.object?.name ?? lastSegment(last.path)} · ${formatDate(last.createdAt)}` : '—',
  })
  if (xp.eventId !== null) root.querySelector('[data-field="xp-caption"]').title = `Event ${xp.eventId} · ${xp.eventPath}`
  const list = root.querySelector('[data-list="xp-events"]')
  list.replaceChildren(...xp.events.map(event => create('li', { className: event.main ? 'main' : '', text: `${event.name} · ${formatXp(event.amount)}` })))
}

function fillAudits(root, audits) {
  const top = Math.max(audits.done, audits.received, 1)
  fill(root, {
    'ratio': formatRatio(audits.ratio),
    'audit-done': formatXp(audits.done),
    'audit-received': formatXp(audits.received),
    'audit-count': audits.count ?? '—',
    'audit-results': audits.count === null ? '—' : `${audits.passed} passed · ${audits.failed} failed`,
  })
  root.querySelector('[data-bar="done"]').style.width = `${(audits.done / top) * 100}%`
  root.querySelector('[data-bar="received"]').style.width = `${(audits.received / top) * 100}%`
}

function fillActivity(root, recent) {
  const list = root.querySelector('[data-list="activity"]')
  if (!recent.length) {
    list.replaceWith(create('p', { className: 'chart-empty', text: 'No XP has been earned yet.' }))
    return
  }
  list.replaceChildren(...recent.map(entry => create('li', {}, [
    create('span', { className: 'activity-name', text: entry.object?.name ?? lastSegment(entry.path) }),
    create('span', { className: 'activity-path', text: entry.path }),
    create('span', { className: 'activity-xp', text: `+${formatXp(entry.amount)}` }),
    create('time', { className: 'activity-date', datetime: entry.createdAt, text: formatDate(entry.createdAt) }),
  ])))
}

function showError(page, error, retry) {
  const button = create('button', { className: 'button', type: 'button', text: 'Try again' })
  button.addEventListener('click', retry)
  page.replaceChildren(create('div', { className: 'card notice' }, [
    create('h2', { className: 'card-title', text: 'Could not load your profile' }),
    create('p', { text: error.message }),
    button,
  ]))
}

let cache = null

export async function renderProfile(page, { onExpired }) {
  page.replaceChildren(fromTemplate('profile-template'))
  const root = page.firstElementChild
  let profile
  try {
    if (cache?.token !== session.token) cache = { token: session.token, profile: await loadProfile(session.token) }
    profile = cache.profile
  } catch (error) {
    if (error.expired) return onExpired()
    return showError(page, error, () => renderProfile(page, { onExpired }))
  }
  if (!root.isConnected) return
  fillIdentity(root, profile.user)
  fillXp(root, profile)
  fillAudits(root, profile.audits)
  fillActivity(root, profile.xp.recent)
  root.removeAttribute('aria-busy')
  timelineChart(root.querySelector('[data-chart="timeline"]'), profile.xp.timeline)
  barChart(root.querySelector('[data-chart="projects"]'), profile.xp.sources, 'XP earned by project')
  drawAuditChart(root.querySelector('[data-chart="audits"]'), profile.audits)
  drawResultsChart(root.querySelector('[data-chart="results"]'), profile.projects)
  radarChart(root.querySelector('[data-chart="skills"]'), profile.skills, 'Skill levels')
}

function drawAuditChart(container, audits) {
  donutChart(container, {
    label: `Audit ratio ${formatRatio(audits.ratio)}: ${formatXp(audits.done)} done, ${formatXp(audits.received)} received`,
    center: formatRatio(audits.ratio),
    caption: 'audit ratio',
    format: formatXp,
    segments: [
      { label: 'Done', value: audits.done, color: '#ff7a59' },
      { label: 'Received', value: audits.received, color: '#8b6cff' },
    ],
  })
}

function drawResultsChart(container, projects) {
  if (!projects) return container.replaceChildren(create('p', { className: 'chart-empty', text: 'Project results are not available.' }))
  const attempts = projects.passedAttempts + projects.failedAttempts
  donutChart(container, {
    label: `${projects.passedAttempts} passed and ${projects.failedAttempts} failed project attempts`,
    center: attempts ? `${Math.round((projects.passedAttempts / attempts) * 100)}%` : '—',
    caption: 'pass rate',
    format: value => `${value} ${value === 1 ? 'attempt' : 'attempts'}`,
    segments: [
      { label: 'Passed', value: projects.passedAttempts, color: '#3ddc97' },
      { label: 'Failed', value: projects.failedAttempts, color: '#ff6b6b' },
    ],
  })
}
