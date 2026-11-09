// Checks the guide panel on the compiler page. It doesn't wait for Java to load, so it's quick.
import { test, expect } from '@playwright/test';
import { guides } from '../src/guide-map.js';

const url = 'http://localhost:4174/compiler/?lang=java';

test('shows the groups and buttons from the language guide', async ({ page }) => {
  await page.goto(url);
  const panel = page.locator('#guide');
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
const editorText = (page) => page.locator('.view-lines').innerText().then((t) => t.replace(/ /g, ' '));

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
