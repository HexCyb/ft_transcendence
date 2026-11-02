// Single-page app router on top of the History API: links change the URL
// without a reload, and the browser's Back / Forward buttons keep working.
export type View = (root: HTMLElement) => (() => void) | void;

const routes = new Map<string, View>();
let root: HTMLElement;
let cleanup: (() => void) | void;

export function route(path: string, view: View): void {
  routes.set(path, view);
}

export function navigate(path: string): void {
  if (path !== location.pathname) history.pushState(null, '', path);
  render();
}

function render(): void {
  if (cleanup) cleanup();     // stop the game loop and listeners of the previous page
  cleanup = undefined;
  root.replaceChildren();
  const view = routes.get(location.pathname) ?? routes.get('*');
  if (view) cleanup = view(root);
  document.querySelectorAll<HTMLAnchorElement>('nav a[data-link]').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === location.pathname);
  });
}

export function startRouter(container: HTMLElement): void {
  root = container;
  window.addEventListener('popstate', render);
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const anchor = target?.closest<HTMLAnchorElement>('a[data-link]');
    if (!anchor || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    navigate(anchor.getAttribute('href') ?? '/');
  });
  render();
}
