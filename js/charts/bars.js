import { createSvg } from '../dom.js'
import { formatNumber, formatXp } from '../format.js'
import { createTooltip, emptyState, responsive, svgRoot, uniqueId } from './common.js'

const ROW = 32

function fit(text, width) {
  const limit = Math.max(4, Math.floor(width / 7.2))
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text
}

export function barChart(container, items, label) {
  if (!items.length) return emptyState(container, 'No project XP yet.')
  const tooltip = createTooltip(container)
  const gradient = uniqueId('bars-fill')
  const max = Math.max(...items.map(item => item.amount))
  const sum = items.reduce((total, item) => total + item.amount, 0)
  let svg = null

  responsive(container, width => {
    const labelWidth = Math.min(170, Math.round(width * 0.34))
    const valueWidth = 70
    const barSpace = Math.max(40, width - labelWidth - valueWidth - 12)
    const height = items.length * ROW
    const next = svgRoot(width, height, label)
    next.append(createSvg('defs', {}, [
      createSvg('linearGradient', { id: gradient, x1: 0, y1: 0, x2: 1, y2: 0 }, [
        createSvg('stop', { offset: 0, 'stop-color': '#ffb35c' }),
        createSvg('stop', { offset: 1, 'stop-color': '#ff5c8a' }),
      ]),
    ]))

    items.forEach((item, i) => {
      const barWidth = Math.max(3, (item.amount / max) * barSpace)
      const row = createSvg('g', { class: 'bar-row', transform: `translate(0, ${i * ROW})`, tabindex: 0 })
      row.append(
        createSvg('text', { class: 'bar-label', x: labelWidth - 10, y: ROW / 2 + 4, 'text-anchor': 'end' }, [fit(item.name, labelWidth - 10)]),
        createSvg('rect', { class: 'bar-track', x: labelWidth, y: 6, width: barSpace, height: ROW - 12, rx: 6 }),
        createSvg('rect', { class: 'bar-grow', x: labelWidth, y: 6, width: barWidth, height: ROW - 12, rx: 6, fill: `url(#${gradient})`, style: `--delay: ${i * 60}ms` }),
        createSvg('text', { class: 'bar-value', x: labelWidth + barSpace + 10, y: ROW / 2 + 4 }, [formatXp(item.amount)]),
      )
      const show = () => tooltip.show([
        [item.name, 'tooltip-title'],
        [`${formatNumber(item.amount)} XP`, 'tooltip-gain'],
        [`${((item.amount / sum) * 100).toFixed(1)}% of the XP shown`, 'tooltip-muted'],
      ], labelWidth + barWidth, i * ROW + 6)
      row.addEventListener('pointerenter', show)
      row.addEventListener('focus', show)
      row.addEventListener('pointerleave', () => tooltip.hide())
      row.addEventListener('blur', () => tooltip.hide())
      next.append(row)
    })

    if (svg) svg.replaceWith(next)
    else container.prepend(next)
    svg = next
  })
}
