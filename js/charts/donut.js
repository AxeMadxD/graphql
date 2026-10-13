import { create, createSvg } from '../dom.js'
import { createTooltip, emptyState, responsive, svgRoot } from './common.js'

const THICKNESS = 24
const GAP = 3

export function donutChart(container, { segments, center, caption, label, format }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  if (!total) return emptyState(container, 'Nothing to show yet.')
  container.classList.add('donut')
  const tooltip = createTooltip(container)
  const legend = create('ul', { className: 'legend' }, segments.map(segment => create('li', {}, [
    create('span', { className: 'swatch', style: `background: ${segment.color}` }),
    create('span', { className: 'legend-label', text: segment.label }),
    create('span', { className: 'legend-value', text: format(segment.value) }),
  ])))
  container.append(legend)
  let svg = null

  responsive(container, width => {
    const size = Math.min(220, Math.max(160, width * 0.5))
    const radius = size / 2 - THICKNESS / 2 - 4
    const circumference = 2 * Math.PI * radius
    const next = svgRoot(size, size, label)
    const ring = createSvg('g', { transform: `rotate(-90 ${size / 2} ${size / 2})` })
    ring.append(createSvg('circle', { class: 'donut-track', cx: size / 2, cy: size / 2, r: radius, 'stroke-width': THICKNESS }))
    let offset = 0
    segments.forEach((segment, i) => {
      if (!segment.value) return
      const length = (segment.value / total) * circumference
      const visible = segments.filter(s => s.value).length > 1 ? Math.max(0, length - GAP) : length
      const arc = createSvg('circle', {
        class: 'donut-arc',
        cx: size / 2,
        cy: size / 2,
        r: radius,
        stroke: segment.color,
        'stroke-width': THICKNESS,
        'stroke-dasharray': `${visible} ${circumference - visible}`,
        'stroke-dashoffset': -offset,
        tabindex: 0,
        style: `--circumference: ${circumference}; animation-delay: ${i * 120}ms`,
      })
      const show = event => {
        const bounds = next.getBoundingClientRect()
        const box = container.getBoundingClientRect()
        const x = event?.clientX ? event.clientX - box.left : bounds.left - box.left + size / 2
        const y = event?.clientY ? event.clientY - box.top : bounds.top - box.top + size / 2
        tooltip.show([
          [segment.label, 'tooltip-title'],
          [format(segment.value), 'tooltip-gain'],
          [`${((segment.value / total) * 100).toFixed(1)}%`, 'tooltip-muted'],
        ], x, y)
      }
      arc.addEventListener('pointermove', show)
      arc.addEventListener('focus', () => show())
      arc.addEventListener('pointerleave', () => tooltip.hide())
      arc.addEventListener('blur', () => tooltip.hide())
      ring.append(arc)
      offset += length
    })
    next.append(
      ring,
      createSvg('text', { class: 'donut-center', x: size / 2, y: size / 2 + 6, 'text-anchor': 'middle' }, [center]),
      createSvg('text', { class: 'donut-caption', x: size / 2, y: size / 2 + 26, 'text-anchor': 'middle' }, [caption]),
    )
    if (svg) svg.replaceWith(next)
    else container.prepend(next)
    svg = next
  })
}
