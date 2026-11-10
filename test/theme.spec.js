// The light and dark themes: readable colours (checked in Node from theme.css) and the toggle (in a browser).
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const compiler = 'http://localhost:4174/compiler/?lang=java';
const home = 'http://localhost:4174/';

// --- Colours. oklch to sRGB, then the WCAG contrast ratio.
function toRgb([L, C, h]) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return linear.map((v) => Math.min(1, Math.max(0, v)));
}
const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const contrast = (x, y) => {
  const [hi, lo] = [luminance(toRgb(x)), luminance(toRgb(y))].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};
const hex = (color) =>
  '#' + toRgb(color).map((v) => Math.round((v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255).toString(16).padStart(2, '0')).join('');

const css = readFileSync(new URL('../src/theme.css', import.meta.url), 'utf8');
const tokensIn = (block) =>
  Object.fromEntries([...block.matchAll(/--([\w-]+):\s*oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/g)].map(([, name, L, C, h]) => [name, [+L, +C, +h]]));
const themes = {
  dark: tokensIn(css.match(/:root\s*\{([^}]*)\}/)[1]),
  light: tokensIn(css.match(/:root\[data-theme="light"\]\s*\{([^}]*)\}/)[1]),
};

for (const [name, t] of Object.entries(themes)) {
  test(`${name} theme: every text colour is readable (at least 4.5 to 1)`, () => {
    for (const text of ['text', 'muted', 'accent', 'error']) {
      for (const background of ['bg', 'surface']) {
        expect(t[text] && t[background], `${name}: --${text} and --${background} exist`).toBeTruthy();
        expect(contrast(t[text], t[background]), `${name}: --${text} on --${background}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
}

test('both themes define the same colours', () => {
  expect(Object.keys(themes.light).sort()).toEqual(Object.keys(themes.dark).sort());
});

test("the editor's background hexes match --bg in each theme", () => {
  const source = readFileSync(new URL('../src/compiler.js', import.meta.url), 'utf8');
  for (const name of ['dark', 'light']) {
    const editorHex = source.match(new RegExp(`'kodigo-${name}'.*?'editor\\.background': '(#[0-9a-f]{6})'`))[1];
    expect(editorHex, `${name} editor background`).toBe(hex(themes[name].bg));
  }
});

// --- The toggle, in a browser.
const lightness = (page) =>
  page.evaluate(() => {
    const context = document.createElement('canvas').getContext('2d');
    context.fillStyle = getComputedStyle(document.body).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  });
const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme ?? null);
const saved = (page) => page.evaluate(() => localStorage.getItem('kodigo-theme'));

test.describe('even when the device prefers light', () => {
  test.use({ colorScheme: 'light' });

  test('both pages are dark until the toggle is pressed', async ({ page }) => {
    for (const url of [home, compiler]) {
      await page.goto(url);
      expect(await theme(page), url).toBeNull();
      expect(await lightness(page), url).toBeLessThan(0.2);
    }
    await expect(page.locator('.monaco-editor.vs-dark')).toBeAttached();
  });
});

test('the toggle switches the page and the editor, and the choice is remembered', async ({ page }) => {
  await page.goto(compiler);
  await expect(page.locator('.monaco-editor.vs-dark')).toBeAttached();
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  expect(await theme(page)).toBe('light');
  expect(await lightness(page)).toBeGreaterThan(0.8);
  await expect(page.locator('.monaco-editor.vs')).toBeAttached();
  await expect(page.locator('.monaco-editor.vs-dark')).toHaveCount(0);
  expect(await saved(page)).toBe('light');

  await page.reload();
  expect(await theme(page)).toBe('light'); // no wrong-theme flash: the head script already set it
  await expect(page.locator('.monaco-editor.vs')).toBeAttached();

  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  expect(await theme(page)).toBe('dark');
  expect(await lightness(page)).toBeLessThan(0.2);
  expect(await saved(page)).toBe('dark');
  await expect(page.locator('.monaco-editor.vs-dark')).toBeAttached();
});

test('a choice made on the home page carries over to the compiler', async ({ page }) => {
  await page.goto(home);
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  expect(await lightness(page)).toBeGreaterThan(0.8);
  await page.goto(compiler);
  expect(await theme(page)).toBe('light');
  await expect(page.locator('.monaco-editor.vs')).toBeAttached();
});

test('the toggle still works for the visit when the browser blocks storage', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  });
  await page.goto(compiler);
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  expect(await theme(page)).toBe('light');
  await expect(page.locator('.monaco-editor.vs')).toBeAttached();
});
