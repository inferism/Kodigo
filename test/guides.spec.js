// Checks that every guide data file matches the format in docs/ARCHITECTURE.md. Runs in Node, no page needed.
import { test, expect } from '@playwright/test';
import { guides } from '../src/guide-map.js';

const filled = (value) => typeof value === 'string' && value.trim() !== '';

// Counts real $0 cursor marks using Monaco's escapes (\$, \\ and \} are literal text).
// Returns -1 for any other unescaped $, such as $1 or $01, which Monaco would read as a placeholder.
function cursorMarks(snippet) {
  let marks = 0;
  for (let i = 0; i < snippet.length; i++) {
    if (snippet[i] === '\\' && '$}\\'.includes(snippet[i + 1])) i++;
    else if (snippet[i] === '$') {
      if (snippet[i + 1] !== '0' || /\d/.test(snippet[i + 2] ?? '')) return -1;
      marks++;
      i++;
    }
  }
  return marks;
}

test('the cursor mark check follows Monaco escapes', () => {
  expect(cursorMarks('no marks')).toBe(0);
  expect(cursorMarks('a $0 b')).toBe(1);
  expect(cursorMarks('// \\$0 then $0')).toBe(1); // an escaped \$0 is text, not a second cursor
  expect(cursorMarks('$0 $0')).toBe(2);
  expect(cursorMarks('$01')).toBe(-1); // Monaco reads this as placeholder 1
  expect(cursorMarks('\\\\$1')).toBe(-1); // \\ is an escaped backslash, so $1 is a real placeholder
  expect(cursorMarks('$1')).toBe(-1);
  expect(cursorMarks('cost: $')).toBe(-1);
});

for (const [id, load] of Object.entries(guides)) {
  test(`${id} guide file has the right shape`, async () => {
    const groups = (await load()).default;
    expect(Array.isArray(groups) && groups.length > 0).toBe(true);
    for (const { group, buttons } of groups) {
      expect(filled(group), 'group name').toBe(true);
      expect(Array.isArray(buttons) && buttons.length > 0, `${group} has buttons`).toBe(true);
      for (const button of buttons) {
        const where = `${group} / ${button.label}`;
        expect(filled(button.label), `${where}: label`).toBe(true);
        expect(filled(button.snippet), `${where}: snippet`).toBe(true);
        expect(filled(button.explanation), `${where}: explanation`).toBe(true);
        const marks = cursorMarks(button.snippet);
        expect(marks, `${where}: a $ that isn't $0 must be written \\$`).not.toBe(-1);
        expect(marks, `${where}: at most one $0`).toBeLessThanOrEqual(1);
      }
    }
  });
}
