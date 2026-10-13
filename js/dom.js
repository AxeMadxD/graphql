export const SVG_NS = 'http://www.w3.org/2000/svg'

export function fromTemplate(id) {
  return document.getElementById(id).content.cloneNode(true)
}

export function create(tag, props = {}, children = []) {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(props)) {
    if (key === 'text') node.textContent = value
    else if (key === 'className') node.className = value
    else node.setAttribute(key, value)
  }
  node.append(...children)
  return node
}

export function createSvg(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag)
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value)
  node.append(...children)
  return node
}

export function fill(root, values) {
  for (const [name, value] of Object.entries(values)) {
    for (const node of root.querySelectorAll(`[data-field="${name}"]`)) node.textContent = value
  }
}
