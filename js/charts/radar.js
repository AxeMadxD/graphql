import { createSvg } from '../dom.js'
import { barChart } from './bars.js'
import { createTooltip, emptyState, responsive, svgRoot, uniqueId } from './common.js'

const LEVELS = [25, 50, 75, 100]

export function radarChart(container, skills, label) {
  if (!skills?.length) return emptyState(container, 'No skills have been recorded yet.')
  const items = skills.slice(0, 10)
  if (items.length < 3) {
    return barChart(container, items.map(item => ({ name: item.name, amount: item.value })), label)
  }
  const tooltip = createTooltip(container)
  const gradient = uniqueId('radar-fill')
  const max = Math.max(100, ...items.map(item => item.value))
  let svg = null

  responsive(container, (width, first) => {
    const size = Math.min(width, 420)
    const center = size / 2
    const radius = size / 2 - 70
    const angle = i => -Math.PI / 2 + (i * 2 * Math.PI) / items.length
    const point = (i, value) => [center + Math.cos(angle(i)) * radius * (value / max), center + Math.sin(angle(i)) * radius * (value / max)]
    const polygon = values => values.map((value, i) => point(i, value).map(n => n.toFixed(1)).join(',')).join(' ')

    const next = svgRoot(size, size, label)
    next.classList.add('radar')
    next.append(createSvg('defs', {}, [
      createSvg('radialGradient', { id: gradient }, [
        createSvg('stop', { offset: 0, 'stop-color': '#ffb35c', 'stop-opacity': 0.5 }),
        createSvg('stop', { offset: 1, 'stop-color': '#ff5c8a', 'stop-opacity': 0.3 }),
      ]),
    ]))
    for (const level of LEVELS) {
      next.append(createSvg('polygon', { class: 'radar-grid', points: polygon(items.map(() => level * (max / 100))) }))
      const [lx, ly] = point(0, level * (max / 100))
      next.append(createSvg('text', { class: 'axis', x: lx + 4, y: ly + 12 }, [`${level}%`]))
    }
    items.forEach((item, i) => {
      const [ex, ey] = point(i, max)
      const cos = Math.cos(angle(i))
      const sin = Math.sin(angle(i))
      next.append(
        createSvg('line', { class: 'radar-axis', x1: center, y1: center, x2: ex, y2: ey }),
        createSvg('text', {
          class: 'radar-label',
          x: center + cos * (radius + 14),
          y: center + sin * (radius + 14) + (sin > 0.3 ? 10 : sin < -0.3 ? -2 : 4),
          'text-anchor': cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle',
        }, [item.name]),
      )
    })

    const shape = createSvg('polygon', { class: 'radar-shape', points: polygon(items.map(item => item.value)), fill: `url(#${gradient})` })
    if (first) shape.classList.add('appear')
    shape.style.transformOrigin = `${center}px ${center}px`
    next.append(shape)

    items.forEach((item, i) => {
      const [px, py] = point(i, item.value)
      const dot = createSvg('circle', { class: 'radar-dot', cx: px, cy: py, r: 4.5, tabindex: 0 })
      const show = () => tooltip.show([[item.name, 'tooltip-title'], [`${item.value}%`, 'tooltip-gain']], px + (container.clientWidth - size) / 2, py)
      dot.addEventListener('pointerenter', show)
      dot.addEventListener('focus', show)
      dot.addEventListener('pointerleave', () => tooltip.hide())
      dot.addEventListener('blur', () => tooltip.hide())
      next.append(dot)
    })

    if (svg) svg.replaceWith(next)
    else container.prepend(next)
    svg = next
  })
}
