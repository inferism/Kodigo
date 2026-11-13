// Throwaway: run the spike page in headless Chromium and print timings. Needs `npx vite --port 5181` running.
import { chromium } from 'playwright';

const programs = {
  c_hello: ['c', '#include <stdio.h>\nint main(void) {\n    printf("Hello from C\\n");\n    return 0;\n}\n'],
  cpp_hello: ['cpp', '#include <iostream>\n#include <vector>\nint main() {\n    std::vector<int> v{1, 2, 3};\n    for (int x : v) std::cout << x << " ";\n    std::cout << "Hello from C++" << std::endl;\n}\n'],
  c_error: ['c', '#include <stdio.h>\nint main(void) {\n    int x = 5\n    printf("%d\\n", x);\n}\n'],
  cpp_error: ['cpp', '#include <iostream>\nint main() {\n    std::cout << y;\n}\n'],
  c_scanf: ['c', '#include <stdio.h>\nint main(void) {\n    int a, b;\n    printf("Two numbers: ");\n    fflush(stdout);\n    scanf("%d %d", &a, &b);\n    printf("Sum: %d\\n", a + b);\n}\n'],
  cpp_cin: ['cpp', '#include <iostream>\n#include <string>\nint main() {\n    std::string name;\n    std::cout << "Name? " << std::flush;\n    std::getline(std::cin, name);\n    int age;\n    std::cout << "Age? ";\n    std::cin >> age;\n    std::cout << name << " is " << age << std::endl;\n}\n'],
  c_loop: ['c', '#include <stdio.h>\nint main(void) {\n    printf("looping\\n");\n    fflush(stdout);\n    while (1) {}\n}\n'],
};
const inputs = { c_scanf: ['3 4'], cpp_cin: ['Ana', '19'] };

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => console.log('[console]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
console.log('Chromium', browser.version());
let t = Date.now();
await page.goto('http://localhost:5181/spike/c-cpp/');
await page.waitForFunction(() => document.getElementById('status').textContent === 'ready', null, { timeout: 300000 });
console.log(`first load ${Date.now() - t} ms`);

for (const [name, [lang, src]] of Object.entries(programs)) {
  await page.selectOption('#lang', lang);
  await page.fill('#src', src);
  t = Date.now();
  await page.evaluate(() => { spike.logs = []; });
  await page.click('#run');
  for (const line of inputs[name] ?? []) {
    await page.waitForFunction((n) => spike.asked >= n, (inputs[name].indexOf(line)) + 1, { timeout: 60000 });
    await page.fill('#input', line);
    await page.press('#input', 'Enter');
  }
  if (name === 'c_loop') {
    await page.waitForFunction(() => spike.out.includes('looping'), null, { timeout: 60000 });
    const responsive = await page.evaluate(() => new Promise((r) => setTimeout(() => r(true), 50)));
    await page.click('#stop');
    console.log(`\n== ${name}: page responsive while looping: ${responsive}`);
    await page.waitForFunction(() => document.getElementById('status').textContent === 'ready', null, { timeout: 120000 });
    console.log(`reload after stop ${Date.now() - t} ms`);
    continue;
  }
  await page.waitForFunction(() => spike.done !== null, null, { timeout: 120000 });
  const r = await page.evaluate(() => spike);
  console.log(`\n== ${name}: exit ${r.done}, total ${Date.now() - t} ms | ${r.logs.join(' | ')}\n${r.out}`);
}
// Run hello again after the stop, to check the fresh worker works.
await page.selectOption('#lang', 'c');
await page.fill('#src', programs.c_hello[1]);
await page.evaluate(() => { spike.done = null; spike.out = ''; });
await page.click('#run');
await page.waitForFunction(() => spike.done !== null, null, { timeout: 120000 });
console.log('\n== after stop:', await page.evaluate(() => spike.out));
await browser.close();
