import { createSvg } from '../dom.js'
import { formatDate, formatMonth, formatXp } from '../format.js'
import { animatePath, createTooltip, emptyState, niceTicks, responsive, svgRoot, uniqueId } from './common.js'

const DAY = 86400000

function monthTicks(start, end, maxTicks) {
  const months = []
  const cursor = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  while (cursor <= end) {
    months.push(new Date(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }
  const every = Math.ceil(months.length / maxTicks) || 1
  return months.filter((_, i) => i % every === 0)
}

export function timelineChart(container, points) {
  if (!points.length) return emptyState(container, 'No XP has been earned in this module yet.')
  const tooltip = createTooltip(container)
  const gradient = uniqueId('timeline-fill')
  let svg = null

  responsive(container, (width, first) => {
    const height = Math.round(Math.min(320, Math.max(220, width * 0.4)))
    const margin = { top: 18, right: 18, bottom: 32, left: 62 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom
    const start = points[0].date
    const end = points.at(-1).date
    const span = Math.max(end - start, DAY)
    const ticks = niceTicks(points.at(-1).total, 4)
    const top = ticks.at(-1)
    const x = date => margin.left + ((date - start) / span) * innerWidth
    const y = value => margin.top + innerHeight - (value / top) * innerHeight
    const coords = points.map(point => [x(point.date), y(point.total)])

    const next = svgRoot(width, height, `Cumulative XP from ${formatDate(start)} to ${formatDate(end)}, reaching ${formatXp(points.at(-1).total)}`)
    next.setAttribute('tabindex', '0')
    next.classList.add('timeline')
    next.append(createSvg('defs', {}, [
      createSvg('linearGradient', { id: gradient, x1: 0, y1: 0, x2: 0, y2: 1 }, [
        createSvg('stop', { offset: 0, 'stop-color': '#ff7a59', 'stop-opacity': 0.45 }),
        createSvg('stop', { offset: 1, 'stop-color': '#8b6cff', 'stop-opacity': 0.02 }),
      ]),
    ]))

    for (const value of ticks) {
      next.append(
        createSvg('line', { class: 'grid', x1: margin.left, x2: width - margin.right, y1: y(value), y2: y(value) }),
        createSvg('text', { class: 'axis', x: margin.left - 10, y: y(value) + 4, 'text-anchor': 'end' }, [formatXp(value)]),
      )
    }
    for (const month of monthTicks(start, end, Math.max(2, Math.floor(innerWidth / 90)))) {
      next.append(createSvg('text', { class: 'axis', x: x(month), y: height - 10, 'text-anchor': 'middle' }, [formatMonth(month)]))
    }

    const line = coords.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join('')
    const baseline = y(0).toFixed(1)
    const area = `M${coords[0][0].toFixed(1)},${baseline}${line.replace('M', 'L')}L${coords.at(-1)[0].toFixed(1)},${baseline}Z`
    const areaPath = createSvg('path', { class: 'area', d: area, fill: `url(#${gradient})` })
    const linePath = createSvg('path', { class: 'line', d: line })
    next.append(areaPath, linePath)

    const dots = createSvg('g', { class: 'dots' })
    if (points.length <= 120) {
      for (const [px, py] of coords) dots.append(createSvg('circle', { cx: px, cy: py, r: 3 }))
    }
    const guide = createSvg('line', { class: 'guide', y1: margin.top, y2: margin.top + innerHeight, visibility: 'hidden' })
    const focus = createSvg('circle', { class: 'focus', r: 6, visibility: 'hidden' })
    next.append(dots, guide, focus)

    let active = -1
    const highlight = index => {
      active = index
      const [px, py] = coords[index]
      const point = points[index]
      guide.setAttribute('x1', px)
      guide.setAttribute('x2', px)
      guide.setAttribute('visibility', 'visible')
      focus.setAttribute('cx', px)
      focus.setAttribute('cy', py)
      focus.setAttribute('visibility', 'visible')
      tooltip.show([
        [point.name, 'tooltip-title'],
        [`+${formatXp(point.amount)}`, 'tooltip-gain'],
        [`Total ${formatXp(point.total)}`],
        [formatDate(point.date), 'tooltip-muted'],
      ], px, py)
    }
    const clear = () => {
      active = -1
      guide.setAttribute('visibility', 'hidden')
      focus.setAttribute('visibility', 'hidden')
      tooltip.hide()
    }
    const nearest = px => {
      let best = 0
      for (let i = 1; i < coords.length; i++) {
        if (Math.abs(coords[i][0] - px) < Math.abs(coords[best][0] - px)) best = i
      }
      return best
    }

    next.addEventListener('pointermove', event => {
      const bounds = next.getBoundingClientRect()
      highlight(nearest(event.clientX - bounds.left))
    })
    next.addEventListener('pointerleave', clear)
    next.addEventListener('blur', clear)
    next.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      const step = event.key === 'ArrowRight' ? 1 : -1
      highlight(Math.min(coords.length - 1, Math.max(0, (active === -1 ? (step > 0 ? -1 : coords.length) : active) + step)))
    })

    if (svg) svg.replaceWith(next)
    else container.prepend(next)
    svg = next
    if (first) animatePath(linePath)
  })
}
