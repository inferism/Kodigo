// Light or dark. The site is dark until the visitor presses the toggle. The choice is then remembered in
// localStorage, on that device only, and nothing is sent anywhere. Each page's <head> also has a tiny script
// that applies the saved choice before the first paint, so there is no flash of the wrong theme.
const KEY = 'kodigo-theme';
const root = document.documentElement;

export const currentTheme = () => (root.dataset.theme === 'light' ? 'light' : 'dark');

// Wires up the toggle button. onChange(theme) runs after each switch, so the editor can follow.
export function setupThemeToggle(button, onChange = () => {}) {
  const label = () => button.setAttribute('aria-label', `Switch to ${currentTheme() === 'light' ? 'dark' : 'light'} theme`);
  button.onclick = () => {
    const next = currentTheme() === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {} // private browsing or blocked storage: the switch still works for this visit
    label();
    onChange(next);
  };
  label();
}
