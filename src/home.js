import { languages } from './languages.js';

const list = document.getElementById('language-list');

for (const { label, blurb, href } of languages) {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.href = href;
  link.className = 'language';
  const name = document.createElement('span');
  name.className = 'language-name';
  name.textContent = label;
  const desc = document.createElement('span');
  desc.className = 'language-blurb';
  desc.textContent = blurb;
  link.append(name, desc);
  item.append(link);
  list.append(item);
}
