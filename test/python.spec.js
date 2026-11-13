// The execution cases from CLAUDE.md for Python, run against the production build.
// Needs internet: Pyodide loads from jsDelivr. One page is shared, so Python loads once (Stop reloads it).
import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const HELLO = 'print("Hello, Kodigo!")\nprint("no newline", end="")\nprint(" ...then more")\n';
const SYNTAX_ERROR = 'print("marker-ran")\nx = = 5\nprint(x)\n';
const RUNTIME_ERROR = 'print("before")\n\nprint(missing_name)\n';
const INPUT = 'name = input("Name: ")\nage = int(input("Age: "))\nprint(f"Hi {name}, next year you will be {age + 1}")\n';
const LOOP = 'print("loop started", flush=True)\nwhile True:\n    pass\n';
// The marker is printed inside the loop, because the panel keeps only the newest output and a marker printed once would scroll away.
const PRINT_FLOOD = 'import sys\nwhile True:\n    print("flood x")\n    print("flood y", file=sys.stderr)\n';

let page;
const run = () => page.locator('#run');
const status = () => page.locator('#status');
const output = () => page.locator('#output');

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  page = await context.newPage();
  await page.goto('http://localhost:4174/compiler/?lang=python');
});

test.afterAll(async () => {
  await page.context().close();
});

// Code goes into the editor by pasting, because typing fights Monaco's auto-closing brackets.
async function runCode(code) {
  await expect(run()).toBeEnabled({ timeout: 120_000 }); // Python has finished loading
  await page.evaluate((text) => navigator.clipboard.writeText(text), code);
  await page.locator('#editor').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('ControlOrMeta+V');
  await run().click();
}

test('the Python page is cross-origin isolated, and the Java page is not', async ({ browser }) => {
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);
  // CheerpJ's files load from a CDN that wouldn't pass the isolation headers, so Java must not get them.
  const java = await (await browser.newContext()).newPage();
  await java.goto('http://localhost:4174/compiler/?lang=java');
  expect(await java.evaluate(() => crossOriginIsolated)).toBe(false);
  await java.context().close();
});

test('a normal program prints its output and exits with code 0', async () => {
  await runCode(HELLO);
  await expect(status()).toHaveText('Finished, exit code 0');
  await expect(output()).toContainText('Hello, Kodigo!');
  await expect(output()).toContainText('no newline ...then more');
});

test('a syntax error shows the right line, a red mark, and runs nothing', async () => {
  await runCode(SYNTAX_ERROR);
  await expect(status()).toHaveText('Finished, exit code 1');
  await expect(output()).toContainText('SyntaxError');
  await expect(page.locator('#output .diagnostic')).toContainText('Line 2');
  await expect(page.locator('.squiggly-error').first()).toBeAttached();
  await expect(output()).not.toContainText('marker-ran'); // a syntax error stops the program before line 1 runs
});

test('a runtime error keeps the output before it, shows its line, and the traceback starts at the program', async () => {
  await runCode(RUNTIME_ERROR);
  await expect(status()).toHaveText('Finished, exit code 1');
  await expect(output()).toContainText('before');
  await expect(output()).toContainText("NameError: name 'missing_name' is not defined");
  await expect(page.locator('#output .diagnostic')).toContainText('Line 3');
  await expect(output()).toContainText('File "main.py", line 3, in <module>');
  await expect(output()).not.toContainText('kodigo_run'); // Kodigo's own wrapper isn't shown to the student
});

test('input() reads lines typed in the output panel', async () => {
  const field = page.getByRole('textbox', { name: 'Program input' });
  await runCode(INPUT);
  await expect(status()).toHaveText('Waiting for input…');
  await expect(output()).toContainText('Name:'); // a prompt with no newline shows before the wait
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

test('sys.stdin.readline() reads a typed line too, and time.sleep waits', async () => {
  const field = page.getByRole('textbox', { name: 'Program input' });
  await runCode('import sys, time\nline = sys.stdin.readline()\ntime.sleep(0.3)\nprint("got " + repr(line))\n');
  await expect(status()).toHaveText('Waiting for input…');
  await field.fill('hello');
  await field.press('Enter');
  await expect(status()).toHaveText('Finished, exit code 0');
  await expect(output()).toContainText('got');
  await expect(output()).toContainText('hello');
});

test("a variable from one run does not exist in the next", async () => {
  await runCode('leftover = 5\nprint("set")\n');
  await expect(status()).toHaveText('Finished, exit code 0');
  await runCode('print(leftover)\n');
  await expect(status()).toHaveText('Finished, exit code 1');
  await expect(output()).toContainText('NameError');
});

test('sys.exit gives its exit code', async () => {
  await runCode('import sys\nprint("bye")\nsys.exit(3)\n');
  await expect(status()).toHaveText('Finished, exit code 3');
  await expect(output()).toContainText('bye');
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

  await runCode(HELLO); // waits for Python to reload first
  await expect(status()).toHaveText('Finished, exit code 0');
});

test('a loop that prints to both streams forever can be stopped, and the page stays responsive', async () => {
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
});

test('Stop works while the program waits for input, and the next run works', async () => {
  await runCode(INPUT);
  await expect(status()).toHaveText('Waiting for input…');
  await page.locator('#stop').click();
  await expect(output()).toContainText('Stopped.');
  await expect(page.getByRole('textbox', { name: 'Program input' })).toBeHidden();

  await runCode(HELLO);
  await expect(status()).toHaveText('Finished, exit code 0');
});

// Each program raises a real error, and the guide's matching explanation must show under it.
const explain = () => page.locator('#output .diagnostic .explain');
for (const [name, code, expected] of [
  ['a missing indent', 'if True:\nprint("x")\n', 'pushed to the right with spaces'],
  ['an extra indent', 'x = 1\n    y = 2\n', 'pushed to the right but the line above'],
  ['an indent that does not line up', 'if True:\n        x = 1\n    y = 2\n', 'do not line up'],
  ['a missing colon', 'if True\n    pass\n', 'must end with a colon'],
  ['an unclosed bracket', 'print("a"\n', 'never closed'],
  ['an unclosed string', 'print("a)\n', 'closing quote is missing'],
  ['other bad syntax', 'x = = 1\n', 'could not understand this line'],
  ['an unknown name', 'print(total)\n', 'Python does not know this name'],
  ['text plus a number', 'print("a" + 1)\n', 'Turn the number into text'],
  ['a number plus text', 'print(1 + "a")\n', 'mixed two kinds of values'],
  ['dividing by zero', 'print(1 / 0)\n', 'divided by zero'],
  ['a list position that is not there', 'print([1][5])\n', 'is not in the list'],
  ['int() of letters', 'int("abc")\n', 'looks like a whole number'],
  ['a method that does not exist', '[].add(1)\n', 'a list has append'],
  ['a module that is not there', 'import nonexistent_module\n', 'not available in Kodigo'],
]) {
  test(`an error for ${name} gets a plain-English explanation`, async () => {
    await runCode(code);
    await expect(explain().first()).toContainText(expected);
    await expect(page.locator('#output .diagnostic').first()).toContainText('Line');
  });
}

// A broken snippet would teach students something wrong, so every Python guide button must be valid Python.
// The cursor mark is removed, except where it sits alone in an indented block, which is only valid with something in it, so it becomes "pass".
test('every Python guide snippet is valid Python', async () => {
  const { guides } = await import('../src/guide-map.js');
  const snippets = (await guides.python()).default.flatMap((g) => g.buttons).map((b) => b.snippet.replace(/\n(\s+)\$0/, '\n$1pass').replace('$0', ''));
  await runCode(`import json\nfor snippet in json.loads(${JSON.stringify(JSON.stringify(snippets))}):\n    compile(snippet, 'snippet', 'exec')\nprint("all ${snippets.length} compile")\n`);
  await expect(status()).toHaveText(/^Finished/);
  await expect(output(), 'a snippet is not valid Python').not.toContainText('Error');
  await expect(status()).toHaveText('Finished, exit code 0');
  await expect(output()).toContainText(`all ${snippets.length} compile`);
});

// Regressions found by Codex's review of PR 73.
test("a program that replaces sys.stdout doesn't hide the next program's output", async () => {
  await runCode('import io, sys\nsys.stdout = io.StringIO()\nprint("hidden")\n');
  await expect(status()).toHaveText('Finished, exit code 0');
  await runCode('print("visible again")\n');
  await expect(status()).toHaveText('Finished, exit code 0');
  await expect(output()).toContainText('visible again');
});

test('a half-read line of input is not carried into the next program', async () => {
  const field = page.getByRole('textbox', { name: 'Program input' });
  await runCode('import sys\nprint("first " + sys.stdin.read(1))\n');
  await expect(status()).toHaveText('Waiting for input…');
  await field.fill('ab');
  await field.press('Enter');
  await expect(status()).toHaveText('Finished, exit code 0');

  await runCode('import sys\nprint("second " + sys.stdin.readline().strip())\n');
  await expect(status()).toHaveText('Waiting for input…'); // not already satisfied by the leftover "b"
  await field.fill('new');
  await field.press('Enter');
  await expect(status()).toHaveText('Finished, exit code 0');
  await expect(output()).toContainText('second new');
});

test('input() reads from sys.stdin when a program replaces it', async () => {
  await runCode('import io, sys\nsys.stdin = io.StringIO("hello\\n")\nprint(input())\n');
  await expect(status()).toHaveText(/^Finished/);
  await expect(output()).not.toContainText('Error');
  await expect(status()).toHaveText('Finished, exit code 0'); // it never waited for typing
  await expect(output()).toContainText('hello');
});

test("input() returns the typed line without its newline", async () => {
  const field = page.getByRole('textbox', { name: 'Program input' });
  await runCode('print(repr(input()))\n');
  await expect(status()).toHaveText('Waiting for input…');
  await field.fill('x y');
  await field.press('Enter');
  await expect(output()).toContainText("'x y'");
});

test('a SyntaxError raised while the program runs points at the line that caused it', async () => {
  await runCode('print("a")\nprint("b")\nprint("c")\neval("1 +")\n');
  await expect(status()).toHaveText('Finished, exit code 1');
  await expect(page.locator('#output .diagnostic')).toContainText('Line 4');
  await expect(output()).toContainText('File "main.py", line 4, in <module>');
  await expect(output()).toContainText('a'); // the lines before it ran
});
