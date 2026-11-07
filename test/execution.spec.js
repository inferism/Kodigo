// The four execution cases from CLAUDE.md, run against the production build.
// Needs internet: CheerpJ loads from its CDN. One page is shared, so Java loads once (Stop reloads it).
import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const HELLO = `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Kodigo!");
    }
}
`;
const MISSING_SEMICOLON = `public class Main {
    public static void main(String[] args) {
        int x = 5
        System.out.println(x);
    }
}
`;
const SCANNER = `import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        System.out.print("Name: ");
        String name = new Scanner(System.in).nextLine();
        System.out.println("Hi " + name);
    }
}
`;
const INFINITE_LOOP = `public class Main {
    public static void main(String[] args) {
        while (true) { }
    }
}
`;

let page;
const run = () => page.locator('#run');
const status = () => page.locator('#status');
const output = () => page.locator('#output');

test.beforeAll(async ({ browser }) => {
  // Code goes into the editor by pasting, because typing fights Monaco's auto-closing brackets.
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  page = await context.newPage();
  await page.goto('http://localhost:4174/compiler/?lang=java');
});

test.afterAll(async () => {
  await page.context().close();
});

async function runCode(code) {
  await expect(run()).toBeEnabled({ timeout: 100_000 }); // Java has finished loading
  await page.evaluate((text) => navigator.clipboard.writeText(text), code);
  await page.locator('#editor').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('ControlOrMeta+V');
  await run().click();
}

test('a normal program prints its output and exits with code 0', async () => {
  await runCode(HELLO);
  await expect(status()).toHaveText('Finished, exit code 0', { timeout: 60_000 });
  await expect(output()).toContainText('Hello, Kodigo!');
});

test('a compile error shows the right line, a red mark, and a button that jumps to it', async () => {
  await runCode(MISSING_SEMICOLON);
  await expect(status()).toHaveText('Finished, exit code 1', { timeout: 60_000 });
  await expect(output()).toContainText("Main.java:3: error: ';' expected");
  await expect(page.locator('#output .diagnostic')).toContainText('Line 3');
  await expect(page.locator('.squiggly-error').first()).toBeAttached();

  await page.locator('#output .diagnostic button').click();
  await expect(page.locator('#editor .native-edit-context')).toBeFocused();
  const cursor = await page.locator('.cursors-layer .cursor').first().boundingBox();
  const line3 = await page.locator('.view-lines .view-line').nth(2).boundingBox();
  expect(cursor.y).toBeGreaterThanOrEqual(line3.y - 2);
  expect(cursor.y).toBeLessThan(line3.y + line3.height);
});

test('a program that reads input fails with a clear message and Java recovers', async () => {
  await runCode(SCANNER);
  await expect(output()).toContainText("This program asks for input, which isn't supported yet.", { timeout: 60_000 });
  await expect(run()).toBeEnabled({ timeout: 100_000 }); // the runner reloaded
});

// Pending until typing input into the output panel exists (Phase 2).
test.fixme('a program can read typed Scanner input', async () => {});

test('an infinite loop can be stopped without freezing the page, and the next run works', async () => {
  await runCode(INFINITE_LOOP);
  await expect(status()).toHaveText('Running…');
  await expect(page.locator('#stop')).toBeVisible();

  // The page must still respond while the loop spins.
  await page.waitForTimeout(3000);
  const delay = await page.evaluate(() => new Promise((resolve) => {
    const start = performance.now();
    setTimeout(() => resolve(performance.now() - start), 50);
  }));
  expect(delay).toBeLessThan(1000);
  await page.locator('#editor').click();
  await page.keyboard.type('// still typing');
  await expect(page.locator('#editor')).toContainText('still typing');

  await page.locator('#stop').click();
  await expect(output()).toContainText('Stopped.');
  await expect(page.locator('#stop')).toBeHidden();

  await runCode(HELLO); // waits for Java to reload first
  await expect(status()).toHaveText('Finished, exit code 0', { timeout: 60_000 });
});
