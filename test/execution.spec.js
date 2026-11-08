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
// Regression: main(int) in the public class must not hide another class's real main.
const WRONG_MAIN_OVERLOAD = `public class Main {
    public static void main(int x) { }
}
class Helper {
    public static void main(String[] args) {
        System.out.println("Helper main ran");
    }
}
`;
// Regression: an inherited main runs from the public class, so Main's static block runs first.
const INHERITED_MAIN = `class Base {
    public static void main(String[] args) {
        System.out.println("Base main ran");
    }
}
public class Main extends Base {
    static { System.out.println("Main initialized"); }
}
`;
// Regression: a class from an earlier run must not satisfy a later program that no longer defines it.
const DEFINES_HELPER = `public class Main {
    public static void main(String[] args) {
        Helper.hi();
    }
}
class Helper {
    static void hi() { System.out.println("Helper ran"); }
}
`;
const USES_MISSING_HELPER = `public class Main {
    public static void main(String[] args) {
        Helper.hi();
    }
}
`;
// Regression: cleanup must never delete a folder whose lock is held, however the timing falls, and must
// delete it once the lock is free. The page holds the lock here, as another tab's worker would.
const MAKES_LOCKED_FOLDER = `import java.nio.file.*;
public class Main {
    public static void main(String[] args) throws Exception {
        Path folder = Files.createDirectories(Path.of("/files/kodigo/test-owner"));
        Files.writeString(folder.resolve("Probe.class"), "probe");
        System.out.println("folder made");
    }
}
`;
const CHECKS_LOCKED_FOLDER = `import java.nio.file.*;
public class Main {
    public static void main(String[] args) {
        System.out.println(Files.exists(Path.of("/files/kodigo/test-owner/Probe.class")) ? "folder kept" : "folder gone");
    }
}
`;
// The marker proves the program compiled and is executing before the test checks the page or presses Stop.
const INFINITE_LOOP = `public class Main {
    public static void main(String[] args) {
        System.out.println("loop started");
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

test('the editor highlights Java code', async () => {
  // Keywords, strings and plain text get different colours once Java highlighting is registered.
  await expect(page.locator('.view-lines .view-line').first()).toBeVisible({ timeout: 30_000 });
  const colours = await page.locator('.view-lines .view-line span span')
    .evaluateAll((spans) => new Set(spans.map((span) => getComputedStyle(span).color)).size);
  expect(colours).toBeGreaterThanOrEqual(3);
});

test('a normal program prints its output and exits with code 0', async () => {
  await runCode(HELLO);
  await expect(status()).toHaveText('Finished, exit code 0', { timeout: 60_000 });
  await expect(output()).toContainText('Hello, Kodigo!');
});

test('a main with the wrong parameters does not hide a real main in another class', async () => {
  await runCode(WRONG_MAIN_OVERLOAD);
  await expect(status()).toHaveText('Finished, exit code 0', { timeout: 60_000 });
  await expect(output()).toContainText('Helper main ran');
});

test("an inherited main runs after the public class's static block", async () => {
  await runCode(INHERITED_MAIN);
  await expect(status()).toHaveText('Finished, exit code 0', { timeout: 60_000 });
  await expect(output()).toContainText(/Main initialized\s+Base main ran/);
});

test('a class left over from an earlier run is not used by the next program', async () => {
  await runCode(DEFINES_HELPER);
  await expect(status()).toHaveText('Finished, exit code 0', { timeout: 60_000 });
  await expect(output()).toContainText('Helper ran');

  await runCode(USES_MISSING_HELPER);
  await expect(status()).toHaveText('Finished, exit code 1', { timeout: 60_000 });
  await expect(output()).toContainText('Main.java:3: error: cannot find symbol');
  await expect(output()).not.toContainText('Helper ran');
});

test('cleanup keeps a folder while its lock is held and deletes it once released', async () => {
  // Holds the lock the way a live worker does, until the test releases it.
  await page.evaluate(() => new Promise((held) => {
    navigator.locks.request('kodigo-classes-test-owner', () => {
      held();
      return new Promise((release) => { window.releaseTestLock = release; });
    });
  }));
  await runCode(MAKES_LOCKED_FOLDER);
  await expect(output()).toContainText('folder made', { timeout: 60_000 });

  await runCode(CHECKS_LOCKED_FOLDER); // compiling runs cleanup first
  await expect(status()).toHaveText('Finished, exit code 0', { timeout: 60_000 });
  await expect(output()).toContainText('folder kept');

  await page.evaluate(() => window.releaseTestLock());
  await runCode(CHECKS_LOCKED_FOLDER);
  await expect(status()).toHaveText('Finished, exit code 0', { timeout: 60_000 });
  await expect(output()).toContainText('folder gone');
});

test('a compile error shows the right line, a red mark, and a button that jumps to it', async () => {
  await runCode(MISSING_SEMICOLON);
  await expect(status()).toHaveText('Finished, exit code 1', { timeout: 60_000 });
  await expect(output()).toContainText("Main.java:3: error: ';' expected");
  await expect(page.locator('#output .diagnostic')).toContainText('Line 3');
  await expect(page.locator('.squiggly-error').first()).toBeAttached();

  await page.locator('#output .diagnostic button').click();
  await expect(page.locator('#editor .native-edit-context')).toBeFocused();
  // Monaco repaints the cursor a moment after the click, so wait for it to reach line 3. Line 3 is found
  // by its text, because Monaco doesn't keep its line elements in line order.
  await expect.poll(async () => {
    const cursor = await page.locator('.cursors-layer .cursor').first().boundingBox();
    const line3 = await page.locator('.view-lines .view-line', { hasText: 'int x = 5' }).boundingBox();
    return cursor.y >= line3.y - 2 && cursor.y < line3.y + line3.height;
  }).toBe(true);
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
  await expect(output()).toContainText('loop started', { timeout: 60_000 }); // compiled and running

  // The page must still respond while the loop spins.
  await page.waitForTimeout(1000);
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
