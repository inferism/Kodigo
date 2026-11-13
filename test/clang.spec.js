// The execution cases from CLAUDE.md for C and C++, run against the production build.
// Needs internet, because clang loads from jsDelivr (about 18 MB the first time).
import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

let page;
const run = () => page.locator('#run');
const status = () => page.locator('#status');
const output = () => page.locator('#output');
const field = () => page.getByRole('textbox', { name: 'Program input' });

async function open(browser, lang) {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  page = await context.newPage();
  await page.goto(`http://localhost:${process.env.KODIGO_TEST_PORT ?? 4174}/compiler/?lang=${lang}`);
}

// Code goes into the editor by pasting, because typing fights Monaco's auto-closing brackets.
async function runCode(code) {
  await expect(run()).toBeEnabled({ timeout: 120_000 }); // the first load downloads clang
  await page.evaluate((text) => navigator.clipboard.writeText(text), code);
  await page.locator('#editor').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('ControlOrMeta+V');
  await run().click();
}

async function type(line) {
  await expect(status()).toHaveText('Waiting for input…');
  await field().fill(line);
  await field().press('Enter');
}

async function expectResponsive() {
  const delay = await page.evaluate(() => new Promise((resolve) => {
    const start = performance.now();
    setTimeout(() => resolve(performance.now() - start), 50);
  }));
  expect(delay).toBeLessThan(1000);
}

test.describe('C', () => {
  test.beforeAll(({ browser }) => open(browser, 'c'));
  test.afterAll(() => page.context().close());

  test('a normal program prints its output and exits with its code', async () => {
    await runCode('#include <stdio.h>\n\nint main(void) {\n    printf("Hello, Kodigo!\\n");\n    return 3;\n}\n');
    await expect(status()).toHaveText('Finished, exit code 3', { timeout: 30_000 });
    await expect(output()).toContainText('Hello, Kodigo!');
  });

  test('a compile error shows the right line and a red mark', async () => {
    await runCode('#include <stdio.h>\nint main(void) {\n    int x = 5\n    printf("%d\\n", x);\n}\n');
    await expect(status()).toHaveText('Finished, exit code 1', { timeout: 30_000 });
    await expect(output()).toContainText("error: expected ';' at end of declaration");
    await expect(page.locator('#output .diagnostic')).toContainText('Line 3');
    await expect(page.locator('.squiggly-error').first()).toBeAttached();
  });

  test('scanf reads lines typed in the output panel', async () => {
    await runCode('#include <stdio.h>\nint main(void) {\n    int a, b;\n    printf("First: ");\n    scanf("%d", &a);\n    printf("Second: ");\n    scanf("%d", &b);\n    printf("Sum: %d\\n", a + b);\n    return 0;\n}\n');
    await type('3');
    await expect(output()).toContainText('Second:');
    await type('4');
    await expect(status()).toHaveText('Finished, exit code 0', { timeout: 30_000 });
    await expect(output()).toContainText(/First: 3\s+Second: 4\s+Sum: 7/);
  });

  test('an infinite loop can be stopped without freezing the page, and the next run works', async () => {
    await runCode('#include <stdio.h>\nint main(void) {\n    printf("loop started\\n");\n    while (1) { }\n}\n');
    await expect(output()).toContainText('loop started', { timeout: 30_000 });
    await page.waitForTimeout(500);
    await expectResponsive();
    await page.locator('#stop').click();
    await expect(output()).toContainText('Stopped.');
    await runCode('#include <stdio.h>\nint main(void) { printf("again\\n"); }\n');
    await expect(status()).toHaveText('Finished, exit code 0', { timeout: 30_000 });
    await expect(output()).toContainText('again');
  });

  test('a loop that prints forever can be stopped, and the page stays responsive', async () => {
    await runCode('#include <stdio.h>\nint main(void) {\n    printf("flood started\\n");\n    while (1) { printf("x\\n"); fprintf(stderr, "y\\n"); }\n}\n');
    await expect(output()).toContainText('flood started', { timeout: 30_000 });
    await page.waitForTimeout(1000);
    await expectResponsive();
    await page.locator('#stop').click();
    await expect(output()).toContainText('Stopped.');
  });

  // Regressions found by Codex's review of PR 74.
  test('a character printed one byte at a time still shows correctly', async () => {
    await runCode('#include <stdio.h>\nint main(void) {\n    int c;\n    printf("Type: ");\n    while ((c = getchar()) != EOF && c != \'\\n\') putchar(c);\n    putchar(\'\\n\');\n    return 0;\n}\n');
    await type('é🙂');
    await expect(status()).toHaveText('Finished, exit code 0', { timeout: 30_000 });
    await expect(output()).toContainText(/Type: é🙂\s+é🙂/);
    await expect(output()).not.toContainText('\uFFFD');
  });

  test('reading 0 bytes returns at once instead of waiting for input', async () => {
    await runCode('#include <stdio.h>\n#include <unistd.h>\nint main(void) {\n    char c;\n    printf("read %ld\\n", (long) read(0, &c, 0));\n    return 0;\n}\n');
    await expect(status()).toHaveText('Finished, exit code 0', { timeout: 30_000 });
    await expect(output()).toContainText('read 0');
  });
});

test.describe('C++', () => {
  test.beforeAll(({ browser }) => open(browser, 'cpp'));
  test.afterAll(() => page.context().close());

  test('a normal program prints its output', async () => {
    await runCode('#include <iostream>\n#include <vector>\nint main() {\n    std::vector<int> v{1, 2, 3};\n    for (int x : v) std::cout << x << " ";\n    std::cout << "done" << std::endl;\n}\n');
    await expect(status()).toHaveText('Finished, exit code 0', { timeout: 30_000 });
    await expect(output()).toContainText('1 2 3 done');
  });

  test('a compile error shows the right line', async () => {
    await runCode('#include <iostream>\nint main() {\n    std::cout << y;\n}\n');
    await expect(status()).toHaveText('Finished, exit code 1', { timeout: 30_000 });
    await expect(output()).toContainText("use of undeclared identifier 'y'");
    await expect(page.locator('#output .diagnostic')).toContainText('Line 3');
  });

  test('cin and getline read lines typed in the output panel', async () => {
    await runCode('#include <iostream>\n#include <string>\nint main() {\n    std::string name;\n    std::cout << "Name: ";\n    std::getline(std::cin, name);\n    int age;\n    std::cout << "Age: ";\n    std::cin >> age;\n    std::cout << "Hi " << name << ", next year you will be " << age + 1 << std::endl;\n}\n');
    await type('Ana');
    await type('19');
    await expect(status()).toHaveText('Finished, exit code 0', { timeout: 30_000 });
    await expect(output()).toContainText(/Name: Ana\s+Age: 19\s+Hi Ana, next year you will be 20/);
  });

  test('an infinite loop can be stopped', async () => {
    await runCode('#include <iostream>\nint main() {\n    std::cout << "loop started" << std::endl;\n    while (true) { }\n}\n');
    await expect(output()).toContainText('loop started', { timeout: 30_000 });
    await expectResponsive();
    await page.locator('#stop').click();
    await expect(output()).toContainText('Stopped.');
  });
});
