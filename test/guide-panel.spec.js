// Checks the guide panel on the compiler page. It doesn't wait for Java to load, so it's quick.
import { test, expect } from '@playwright/test';
import { guides } from '../src/guide-map.js';

const url = 'http://localhost:4174/compiler/?lang=java';

test('shows the groups and buttons from the language guide', async ({ page }) => {
  await page.goto(url);
  const panel = page.locator('#guide');
  await expect(panel.getByText('Click in your code where you want it')).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'Loops' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'for loop', exact: true })).toBeVisible();
  await expect(page.locator('#editor')).toBeVisible();
});

test('collapses and expands', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(url);
  const toggle = page.getByRole('button', { name: 'Guide' });
  const button = page.getByRole('button', { name: 'for loop', exact: true });

  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const open = await page.locator('#guide').boundingBox();
  expect(open.width).toBeGreaterThan(200);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toBeHidden();
  await expect.poll(async () => (await page.locator('#guide').boundingBox()).width).toBeLessThan(60);

  await toggle.click();
  await expect(button).toBeVisible();
});

test('starts collapsed on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(url);
  await expect(page.getByRole('button', { name: 'Guide' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'for loop', exact: true })).toBeHidden();
});

// The for loop is the multi-line button, so it shows indenting and where the cursor lands.
const forLoop = async () => (await guides.java()).default.flatMap((g) => g.buttons).find((b) => b.label === 'for loop');

// Replaces the editor's text. Pasting avoids Monaco's auto-closing brackets, which typing triggers.
async function setCode(page, code) {
  await page.evaluate((text) => navigator.clipboard.writeText(text), code);
  await page.locator('#editor').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('ControlOrMeta+V');
}
// Monaco doesn't keep its line elements in line order, so sort them by where they are on screen.
const editorText = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.view-lines .view-line')]
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
      .map((line) => line.textContent.replace(/\s/g, ' '))
      .join('\n'),
  );

test.describe('inserting a snippet', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('a button inserts its snippet and leaves the cursor at $0', async ({ page }) => {
    const { snippet, label } = await forLoop();
    await page.goto(url);
    await setCode(page, 'x');
    await page.keyboard.press('Backspace'); // pasting an empty string would change nothing
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.keyboard.type('X'); // lands where $0 was
    await expect.poll(() => editorText(page)).toBe(snippet.replace('$0', 'X'));
  });

  test('every inserted line gets the indent of the cursor line', async ({ page }) => {
    const { snippet, label } = await forLoop();
    await page.goto(url);
    await setCode(page, 'if (a) {\n    \n}');
    await page.keyboard.press('ControlOrMeta+Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End'); // end of the indented blank line
    await page.getByRole('button', { name: label, exact: true }).click();
    // The first line goes after the cursor's own 4 spaces. Every later line gets 4 more.
    const indented = snippet.replace('$0', '').split('\n').map((line, i) => (i ? '    ' + line : line));
    await expect.poll(() => editorText(page)).toBe(`if (a) {\n    ${indented.join('\n')}\n}`);
  });
});

test.describe('explanations', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('the arrow opens and closes the explanation without inserting anything', async ({ page }) => {
    const { label, explanation } = (await guides.java()).default[0].buttons[0];
    await page.goto(url);
    await expect.poll(() => editorText(page)).toContain('public class Main'); // the editor has drawn its text
    const before = await editorText(page);
    const arrow = page.getByRole('button', { name: `Explain ${label}`, exact: true });
    const text = page.getByText(explanation, { exact: true });

    await expect(text).toBeHidden();
    await arrow.click();
    await expect(arrow).toHaveAttribute('aria-expanded', 'true');
    await expect(text).toBeVisible();
    await arrow.click();
    await expect(arrow).toHaveAttribute('aria-expanded', 'false');
    await expect(text).toBeHidden();
    expect(await editorText(page)).toBe(before);
  });

  test('the label still inserts the snippet while the explanation is open', async ({ page }) => {
    const { snippet, label } = (await guides.java()).default[0].buttons[0];
    await page.goto(url);
    await page.getByRole('button', { name: `Explain ${label}`, exact: true }).click();
    await setCode(page, 'x');
    await page.keyboard.press('Backspace');
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.keyboard.type('X');
    await expect.poll(() => editorText(page)).toBe(snippet.replace('$0', 'X'));
  });
});

test.describe('button imports', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });
  const scanner = 'Scanner in = new Scanner(System.in);';
  // Blank lines are left out of the comparison, because Monaco draws them as empty elements.
  const lines = (page) => editorText(page).then((t) => t.split('\n').filter((l) => l.trim()));

  async function clickScannerInside(page, code, linesDown) {
    await page.goto(url);
    await setCode(page, code);
    await page.keyboard.press('ControlOrMeta+Home');
    for (let i = 0; i < linesDown; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');
    await page.getByRole('button', { name: 'Scanner', exact: true }).click();
  }

  test('Scanner puts its import on line 1 and the snippet at the cursor', async ({ page }) => {
    await clickScannerInside(page, 'class A {\n    void m() {\n        \n    }\n}', 2);
    await expect.poll(() => lines(page)).toEqual(['import java.util.Scanner;', 'class A {', '    void m() {', `        ${scanner}`, '    }', '}']);
  });

  test('the import goes after the last existing import', async ({ page }) => {
    await clickScannerInside(page, 'import java.util.List;\nclass A {\n    \n}', 2);
    await expect.poll(() => lines(page)).toEqual(['import java.util.List;', 'import java.util.Scanner;', 'class A {', `    ${scanner}`, '}']);
  });

  test('the import is not added twice', async ({ page }) => {
    await clickScannerInside(page, 'class A {\n    \n}', 1);
    await page.getByRole('button', { name: 'Scanner', exact: true }).click();
    // The snippet itself goes in each time, but the import only once.
    // (both snippets land on the same line, because the cursor stays at the end of the first)
    await expect.poll(async () => (await editorText(page)).split(scanner).length - 1).toBe(2);
    expect((await lines(page)).filter((l) => l.startsWith('import')).length).toBe(1);
  });
});

test.describe('imports that are not real imports', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });
  const scanner = 'Scanner in = new Scanner(System.in);';
  const lines = (page) => editorText(page).then((t) => t.split('\n').filter((l) => l.trim()));

  async function pressScanner(page, code, linesDown) {
    await page.goto(url);
    await setCode(page, code);
    await page.keyboard.press('ControlOrMeta+Home');
    for (let i = 0; i < linesDown; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');
    await page.getByRole('button', { name: 'Scanner', exact: true }).click();
  }

  test('a commented-out Scanner import does not count', async ({ page }) => {
    await pressScanner(page, '/*\nimport java.util.Scanner;\n*/\nclass A {\n    \n}', 4);
    await expect.poll(() => lines(page)).toEqual(['import java.util.Scanner;', '/*', 'import java.util.Scanner;', '*/', 'class A {', `    ${scanner}`, '}']);
  });

  test('a commented-out other import is not used as the place to add one', async ({ page }) => {
    await pressScanner(page, '/*\nimport java.util.List;\n*/\nclass A {\n    \n}', 4);
    await expect.poll(() => lines(page)).toEqual(['import java.util.Scanner;', '/*', 'import java.util.List;', '*/', 'class A {', `    ${scanner}`, '}']);
  });

  test('an import line inside a text block does not count', async ({ page }) => {
    await pressScanner(page, 'class A {\n    String s = """\n    import java.util.Scanner;\n    """;\n    void m() {\n        \n    }\n}', 5);
    await expect.poll(async () => (await lines(page))[0]).toBe('import java.util.Scanner;');
    // The real one, and the one in the text block.
    expect((await lines(page)).filter((l) => l.trim() === 'import java.util.Scanner;').length).toBe(2);
  });
});

test.describe('multi-line imports', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('a new import is added after an import split over two lines, not in the middle of it', async ({ page }) => {
    await page.goto(url);
    await setCode(page, 'import java.util.\n    List;\nclass A {\n    \n}');
    await page.keyboard.press('ControlOrMeta+Home');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');
    await page.getByRole('button', { name: 'Scanner', exact: true }).click();
    const lines = async () => (await editorText(page)).split('\n').filter((l) => l.trim());
    await expect.poll(lines).toEqual(['import java.util.', '    List;', 'import java.util.Scanner;', 'class A {', '    Scanner in = new Scanner(System.in);', '}']);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth > innerWidth);

  test('the guide opens as a drawer over the lower half, with the editor still visible above it', async ({ page }) => {
    await page.goto(url);
    const toggle = page.getByRole('button', { name: 'Guide' });
    const bar = await page.locator('#guide').boundingBox();
    await toggle.click();
    await expect(page.getByRole('button', { name: 'for loop', exact: true })).toBeVisible();
    const drawer = await page.locator('#guide').boundingBox();
    const editor = await page.locator('#editor').boundingBox();
    expect(drawer.y).toBeGreaterThan(800 * 0.4); // it fills only the lower part
    expect(drawer.y + drawer.height).toBeLessThanOrEqual(800); // and stays on screen
    expect(editor.y + 100).toBeLessThan(drawer.y); // the top of the editor is not covered
    expect(drawer.height).toBeGreaterThan(bar.height * 3);
    expect(await sideways(page)).toBe(false);
  });

  test('Escape closes the drawer and puts focus back on its button', async ({ page }) => {
    await page.goto(url);
    const toggle = page.getByRole('button', { name: 'Guide' });
    await toggle.click();
    await page.getByRole('button', { name: 'Explain for loop' }).focus();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    expect(await sideways(page)).toBe(false);
  });

  test('a button inserts its snippet and closes the drawer', async ({ page }) => {
    await page.goto(url);
    const toggle = page.getByRole('button', { name: 'Guide' });
    await toggle.click();
    await page.getByRole('button', { name: 'System.out.println', exact: true }).click();
    await expect.poll(() => editorText(page)).toContain('System.out.println("");');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('the caret is not left behind the drawer when the cursor is near the bottom of a longer program', async ({ page }) => {
    await page.goto(url);
    await setCode(page, Array.from({ length: 40 }, (_, i) => `// line ${i}`).join('\n')); // the cursor ends up at the bottom
    await page.getByRole('button', { name: 'Guide' }).click();
    await page.getByRole('button', { name: 'System.out.println', exact: true }).click();
    await page.keyboard.type('X'); // typing goes where the snippet left the caret
    await expect.poll(() => editorText(page)).toContain('System.out.println("X");');
    const caret = await page.locator('.cursors-layer .cursor').first().boundingBox();
    const guide = await page.locator('#guide').boundingBox();
    const editor = await page.locator('#editor').boundingBox();
    expect(caret.y).toBeGreaterThanOrEqual(editor.y); // inside the editor
    expect(caret.y + caret.height).toBeLessThanOrEqual(guide.y); // and above the guide bar, so it is visible
  });

  test('long lines wrap in the editor instead of scrolling sideways', async ({ page }) => {
    await page.goto(url);
    await setCode(page, `// ${'word '.repeat(60)}
// end`);
    // A wrapped line takes several rows, so the next line sits well below it.
    const top = (text) => page.locator('.view-lines .view-line', { hasText: text }).first().evaluate((el) => el.getBoundingClientRect().top);
    await expect.poll(async () => (await top('// end')) - (await top('word word'))).toBeGreaterThan(40);
  });
});

test.describe('a package or import on the same line as the class', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('Scanner adds its import after the package line, and the program still compiles and runs', async ({ page }) => {
    await page.goto(url);
    await setCode(page, 'package demo; public class Main {\n    public static void main(String[] args) {\n        \n    }\n}');
    await page.keyboard.press('ControlOrMeta+Home');
    for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');
    await page.getByRole('button', { name: 'Scanner', exact: true }).click();
    const lines = async () => (await editorText(page)).split('\n').filter((l) => l.trim());
    // The import must not land inside the class, which is what "the next line" used to mean here.
    await expect.poll(lines).toEqual([
      'package demo;',
      'import java.util.Scanner; public class Main {',
      '    public static void main(String[] args) {',
      '        Scanner in = new Scanner(System.in);',
      '    }',
      '}',
    ]);
    await expect(page.locator('#run')).toBeEnabled({ timeout: 100_000 }); // Java has finished loading
    await page.locator('#run').click();
    await expect(page.locator('#status')).toHaveText('Finished, exit code 0', { timeout: 60_000 });
  });
});
