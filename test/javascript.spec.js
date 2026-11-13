// The execution cases from CLAUDE.md for JavaScript, run against the production build.
// No internet needed: JavaScript runs in a Web Worker from our own files.
import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const HELLO = 'console.log("Hello, Kodigo!");\nconsole.log([1, 2], { a: 1 }, 3);\n';
const SYNTAX_ERROR = 'console.log("one");\nlet x = ;\nconsole.log(x);\n';
const RUNTIME_ERROR = 'console.log("before");\n\nmissingName.go();\n';
const INPUT = 'const name = await input("Name: ");\nconst age = Number(await input("Age: "));\nconsole.log(`Hi ${name}, next year you will be ${age + 1}`);\n';
const TIMER = 'setTimeout(() => console.log("later"), 300);\nconsole.log("now");\n';
const LOOP = 'console.log("loop started");\nwhile (true) { }\n';
// The marker is printed inside the loop, because the panel keeps only the newest output and a marker printed once would scroll away.
const PRINT_FLOOD = 'while (true) { console.log("flood x"); }\n';

let page;
const run = () => page.locator('#run');
const status = () => page.locator('#status');
const output = () => page.locator('#output');

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  page = await context.newPage();
  await page.goto('http://localhost:4174/compiler/?lang=javascript');
});

test.afterAll(async () => {
  await page.context().close();
});

// Code goes into the editor by pasting, because typing fights Monaco's auto-closing brackets.
async function runCode(code) {
  await expect(run()).toBeEnabled({ timeout: 10_000 });
  await page.evaluate((text) => navigator.clipboard.writeText(text), code);
  await page.locator('#editor').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('ControlOrMeta+V');
  await run().click();
}

test('a normal program prints its output and exits with code 0', async () => {
  await runCode(HELLO);
  await expect(status()).toHaveText('Finished, exit code 0');
  await expect(output()).toContainText('Hello, Kodigo!');
  await expect(output()).toContainText('[1,2] {"a":1} 3');
});

test('a syntax error shows the right line, a red mark, and runs nothing', async () => {
  await runCode(SYNTAX_ERROR);
  await expect(status()).toHaveText('Finished, exit code 1');
  await expect(output()).toContainText('SyntaxError: Unexpected token');
  await expect(page.locator('#output .diagnostic')).toContainText('Line 2');
  await expect(page.locator('.squiggly-error').first()).toBeAttached();
  await expect(output()).not.toContainText('one'); // a syntax error stops the program before line 1 runs
});

test('a runtime error keeps the output before it and shows its line', async () => {
  await runCode(RUNTIME_ERROR);
  await expect(status()).toHaveText('Finished, exit code 1');
  await expect(output()).toContainText('before');
  await expect(output()).toContainText('ReferenceError: missingName is not defined');
  await expect(page.locator('#output .diagnostic')).toContainText('Line 3');
});

test('await input() reads lines typed in the output panel', async () => {
  const field = page.getByRole('textbox', { name: 'Program input' });
  await runCode(INPUT);
  await expect(status()).toHaveText('Waiting for input…');
  await expect(output()).toContainText('Name:');
  await expect(field).toBeFocused();
  await field.fill('Ana');
  await field.press('Enter');
  await expect(output()).toContainText('Age:');
  await expect(status()).toHaveText('Waiting for input…');
  await field.fill('19');
  await field.press('Enter');
  await expect(status()).toHaveText('Finished, exit code 0');
  await expect(output()).toContainText(/Name: Ana\s+Age: 19\s+Hi Ana, next year you will be 20/);
  await expect(field).toBeHidden();
});

test('the run waits for a timer before it finishes', async () => {
  await runCode(TIMER);
  await expect(status()).toHaveText('Running…');
  await expect(status()).toHaveText('Finished, exit code 0');
  await expect(output()).toContainText(/now\s+later/);
});

test('an infinite loop can be stopped without freezing the page, and the next run works', async () => {
  await runCode(LOOP);
  await expect(output()).toContainText('loop started');
  await page.waitForTimeout(500);
  const delay = await page.evaluate(() => new Promise((resolve) => {
    const start = performance.now();
    setTimeout(() => resolve(performance.now() - start), 50);
  }));
  expect(delay).toBeLessThan(1000);

  await page.locator('#stop').click();
  await expect(output()).toContainText('Stopped.');
  await expect(page.locator('#stop')).toBeHidden();

  await runCode(HELLO);
  await expect(status()).toHaveText('Finished, exit code 0');
});

test('a loop that prints forever can be stopped, and the page stays responsive', async () => {
  await runCode(PRINT_FLOOD);
  await expect(output()).toContainText('flood x');
  await page.waitForTimeout(1000);
  const delay = await page.evaluate(() => new Promise((resolve) => {
    const start = performance.now();
    setTimeout(() => resolve(performance.now() - start), 50);
  }));
  expect(delay).toBeLessThan(1000);

  await page.locator('#stop').click();
  await expect(output()).toContainText('Stopped.');

  await runCode(HELLO);
  await expect(status()).toHaveText('Finished, exit code 0');
});

// Regressions found by Codex's review of PR 72.
test('a loop that alternates stdout and stderr forever can be stopped, and the page stays responsive', async () => {
  await runCode('while (true) { console.log("flood x"); console.error("flood y"); }\n');
  await expect(output()).toContainText('flood x');
  await page.waitForTimeout(1000);
  const delay = await page.evaluate(() => new Promise((resolve) => {
    const start = performance.now();
    setTimeout(() => resolve(performance.now() - start), 50);
  }));
  expect(delay).toBeLessThan(1000);
  await page.locator('#stop').click();
  await expect(output()).toContainText('Stopped.');
});

test('a promise that rejects with nobody handling it ends with exit code 1', async () => {
  await runCode('Promise.reject(new Error("failed"));\n');
  await expect(status()).toHaveText('Finished, exit code 1');
  await expect(output()).toContainText('Error: failed');
});

test('input can be read inside a timer callback', async () => {
  const field = page.getByRole('textbox', { name: 'Program input' });
  await runCode('setTimeout(async () => console.log("Hi " + await input("Name: ")), 10);\n');
  await expect(output()).toContainText('Name:');
  await expect(status()).toHaveText('Waiting for input…');
  await field.fill('Ana');
  await field.press('Enter');
  await expect(output()).toContainText('Hi Ana');
  await expect(status()).toHaveText('Finished, exit code 0');
});

test('clearing an interval after an await lets the run finish', async () => {
  await runCode('const id = setInterval(async () => { await Promise.resolve(); clearInterval(id); console.log("cleared"); }, 10);\n');
  await expect(output()).toContainText('cleared');
  await expect(status()).toHaveText('Finished, exit code 0');
});
