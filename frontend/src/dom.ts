type Child = Node | string | null | undefined | false;
type Prop = string | number | boolean | EventListener;

// Small DOM builder. Text always goes in as text nodes, never as HTML,
// so names typed by players can't inject markup (no XSS).
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, Prop> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'class') node.className = String(value);
    else if (typeof value === 'boolean') node.toggleAttribute(key, value);
    else node.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child !== null && child !== undefined && child !== false) node.append(child);
  }
  return node;
}

export function link(href: string, text: string, className = ''): HTMLAnchorElement {
  return el('a', { href, 'data-link': true, class: className }, text);
}
