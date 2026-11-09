// Text sent to the panel is added as text, never as HTML.
// shortcut: keeps about the last 200,000 characters so a program that prints forever can't freeze the page; revisit once Stop exists.
const MAX = 200_000;
const SLACK = 50_000; // trim in big steps, so a busy program doesn't re-copy the text on every flush

export function createOutput(box) {
  let size = 0;
  let pending = []; // [kind, text] pairs waiting for the next flush
  let timer = null;

  // The program's input line. It stays the last thing in the panel, so output goes in front of it.
  const input = document.createElement('input');
  input.className = 'stdin-field';
  input.hidden = true;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.enterKeyHint = 'send';
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('aria-label', 'Program input');
  box.append(input);
  let onLine = null;

  input.onkeydown = (event) => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    const line = input.value;
    input.value = '';
    write('stdin', `${line}
`); // stays in the panel, like a console
    onLine(line);
  };
  // Clicking the panel types into the program, unless the student is selecting text to copy.
  box.addEventListener('click', () => {
    if (!input.hidden && getSelection().isCollapsed) input.focus();
  });

  // Programs can print thousands of lines in a burst. Collect them and touch the page once per tick.
  function flush() {
    timer = null;
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 8;
    for (const [kind, text, error, onClick] of pending) {
      if (kind === 'diagnostic') {
        const row = document.createElement('div');
        row.className = kind;
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = `Line ${error.line}`;
        button.onclick = onClick;
        row.append(button, ` ${error.message}\n`);
        if (error.explanation) row.append(Object.assign(document.createElement('span'), { className: 'explain', textContent: error.explanation }));
        input.before(row);
        size += row.textContent.length;
        continue;
      }
      let last = input.previousElementSibling;
      if (last?.className !== kind) {
        last = document.createElement('span');
        last.className = kind;
        input.before(last);
      }
      last.append(text);
      size += text.length;
    }
    pending = [];

    while (size > MAX + SLACK) {
      const first = box.firstElementChild;
      if (first.className === 'diagnostic') { // drop a whole row, so its button isn't flattened into text
        size -= first.textContent.length;
        first.remove();
        continue;
      }
      const old = first.textContent;
      const cut = Math.min(size - MAX, old.length);
      first.textContent = old.slice(cut);
      if (!first.textContent) first.remove();
      size -= cut;
    }
    if (atBottom) box.scrollTop = box.scrollHeight;
  }

  function write(kind, text) {
    const last = pending[pending.length - 1];
    if (last?.[0] === kind) last[1] += text;
    else pending.push([kind, text]);
    timer ??= setTimeout(flush, 16);
  }

  return {
    stdout: (text) => write('stdout', text),
    stderr: (text) => write('stderr', text),
    // A row with a "Line N" button, queued with the text so it stays in order.
    diagnostic(error, onClick) {
      pending.push(['diagnostic', '', error, onClick]);
      timer ??= setTimeout(flush, 16);
    },
    clear() {
      clearTimeout(timer);
      timer = null;
      pending = [];
      size = 0;
      box.replaceChildren(input);
    },
    // Shows the input line. onLine(text) gets each line when Enter is pressed.
    showInput(callback) {
      onLine = callback;
      input.value = '';
      input.hidden = false;
    },
    focusInput() {
      input.focus();
    },
    hideInput() {
      if (document.activeElement === input) box.focus(); // keep keyboard users in the panel
      input.hidden = true;
      input.value = '';
      onLine = null;
    },
  };
}
