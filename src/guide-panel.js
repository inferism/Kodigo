// Fills the guide panel from a language's guide data (format: docs/ARCHITECTURE.md, "Guide buttons").
// It knows nothing about any language or editor. `load` is the lazy import from guide-map.js, or undefined.
// `insert(snippet)` puts a snippet into the editor.
export async function showGuide(aside, load, insert) {
  const toggle = aside.querySelector('.guide-toggle');
  const body = aside.querySelector('.guide-body');

  const setOpen = (open) => {
    aside.classList.toggle('collapsed', !open);
    toggle.setAttribute('aria-expanded', open);
  };
  toggle.onclick = () => setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  if (matchMedia('(max-width: 47.99rem)').matches) setOpen(false); // stacked under the editor on a phone

  const note = (text) => body.append(Object.assign(document.createElement('p'), { className: 'guide-note', textContent: text }));
  if (!load) return note('No guide for this language yet.');

  let groups;
  try {
    groups = (await load()).default;
  } catch {
    return note("Couldn't load the guide. Refresh the page to try again.");
  }

  for (const { group, buttons } of groups) {
    const section = document.createElement('section');
    const heading = Object.assign(document.createElement('h3'), { textContent: group });
    const list = document.createElement('ul');
    for (const { label, snippet } of buttons) {
      const item = document.createElement('li');
      item.append(Object.assign(document.createElement('button'), { type: 'button', textContent: label, onclick: () => insert(snippet) }));
      list.append(item);
    }
    section.append(heading, list);
    body.append(section);
  }
}
