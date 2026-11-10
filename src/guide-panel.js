// Fills the guide panel from a language's guide data (format: docs/ARCHITECTURE.md, "Guide buttons").
// It knows nothing about any language or editor. `load` is the lazy import from guide-map.js, or undefined.
// `insert(snippet, imports)` puts a snippet into the editor, and adds the button's optional import lines.
const ARROW = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let explainCount = 0; // makes each explanation's id unique, for aria-controls
export async function showGuide(aside, load, insert) {
  const toggle = aside.querySelector('.guide-toggle');
  const body = aside.querySelector('.guide-body');

  const setOpen = (open) => {
    aside.classList.toggle('collapsed', !open);
    toggle.setAttribute('aria-expanded', open);
  };
  toggle.onclick = () => setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  aside.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || aside.classList.contains('collapsed')) return;
    setOpen(false);
    toggle.focus(); // the focused button would otherwise be hidden
  });
  if (matchMedia('(max-width: 47.99rem)').matches) setOpen(false); // stacked under the editor on a phone

  const note = (text) => body.append(Object.assign(document.createElement('p'), { className: 'guide-note', textContent: text }));
  if (!load) return note('No guide for this language yet.');

  let groups;
  try {
    groups = (await load()).default;
  } catch {
    return note("Couldn't load the guide. Refresh the page to try again.");
  }

  note('Click in your code where you want it, then press a button.');
  for (const { group, buttons } of groups) {
    const section = document.createElement('section');
    const heading = Object.assign(document.createElement('h3'), { textContent: group });
    const list = document.createElement('ul');
    for (const { label, snippet, imports, explanation } of buttons) {
      const item = document.createElement('li');
      const row = document.createElement('div');
      const insertButton = Object.assign(document.createElement('button'), { type: 'button', className: 'guide-insert', textContent: label, onclick: () => insert(snippet, imports) });
      const text = Object.assign(document.createElement('p'), { id: `guide-explain-${explainCount++}`, className: 'guide-explain', hidden: true, textContent: explanation });
      const arrow = Object.assign(document.createElement('button'), { type: 'button', className: 'guide-arrow', ariaLabel: `Explain ${label}`, innerHTML: ARROW });
      arrow.setAttribute('aria-expanded', 'false');
      arrow.setAttribute('aria-controls', text.id);
      arrow.onclick = () => {
        text.hidden = !text.hidden;
        arrow.setAttribute('aria-expanded', !text.hidden);
      };
      row.className = 'guide-row';
      row.append(insertButton, arrow);
      item.append(row, text);
      list.append(item);
    }
    section.append(heading, list);
    body.append(section);
  }
}
