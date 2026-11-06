// Text sent to the panel is added as text, never as HTML.
// shortcut: keeps about the last 200,000 characters so a program that prints forever can't freeze the page; revisit once Stop exists.
const MAX = 200_000;
const SLACK = 50_000; // trim in big steps, so a busy program doesn't re-copy the text on every flush

export function createOutput(box) {
  let size = 0;
  let pending = []; // [kind, text] pairs waiting for the next flush
  let timer = null;

  // Programs can print thousands of lines in a burst. Collect them and touch the page once per tick.
  function flush() {
    timer = null;
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 8;
    for (const [kind, text] of pending) {
      let last = box.lastElementChild;
      if (last?.className !== kind) {
        last = document.createElement('span');
        last.className = kind;
        box.append(last);
      }
      last.append(text);
      size += text.length;
    }
    pending = [];

    while (size > MAX + SLACK) {
      const first = box.firstElementChild;
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
    clear() {
      clearTimeout(timer);
      timer = null;
      pending = [];
      size = 0;
      box.replaceChildren();
    },
  };
}
