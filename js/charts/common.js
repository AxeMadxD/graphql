import { create, createSvg } from '../dom.js'

let counter = 0

export function uniqueId(prefix) {
  counter += 1
  return `${prefix}-${counter}`
}

export function niceTicks(max, count = 4) {
  if (!(max > 0)) return [0, 1]
  const raw = max / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const residual = raw / magnitude
  const step = (residual > 5 ? 10 : residual > 2.5 ? 5 : residual > 2 ? 2.5 : residual > 1 ? 2 : 1) * magnitude
  const ticks = []
  for (let value = 0; value < max + step; value += step) ticks.push(value)
  return ticks
}

export function responsive(container, draw) {
  let width = 0
  const observer = new ResizeObserver(entries => {
    if (!container.isConnected) {
      observer.disconnect()
      return
    }
    const next = Math.round(entries[0].contentRect.width)
    if (!next || next === width) return
    const first = width === 0
    width = next
    draw(width, first)
  })
  observer.observe(container)
}

export function createTooltip(container) {
  const tip = create('div', { className: 'tooltip', role: 'status' })
  tip.hidden = true
  container.append(tip)
  return {
    show(lines, x, y) {
      tip.replaceChildren(...lines.map(([text, className]) => create('span', { className: className ?? '', text })))
      tip.hidden = false
      const width = tip.offsetWidth
      const left = x + 14 + width > container.clientWidth ? x - 14 - width : x + 14
      tip.style.transform = `translate(${Math.max(0, left)}px, ${Math.max(0, y - tip.offsetHeight - 10)}px)`
    },
    hide() {
      tip.hidden = true
    },
  }
}

export function emptyState(container, text) {
  container.replaceChildren(create('p', { className: 'chart-empty', text }))
}

export function svgRoot(width, height, label) {
  return createSvg('svg', {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': label,
  })
}

export function animatePath(path) {
  const length = path.getTotalLength()
  path.style.setProperty('--length', length)
  path.classList.add('draw')
}
