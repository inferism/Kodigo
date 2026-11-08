// Checks that every guide data file matches the format in docs/ARCHITECTURE.md. Runs in Node, no page needed.
import { test, expect } from '@playwright/test';
import { guides } from '../src/guide-map.js';

const filled = (value) => typeof value === 'string' && value.trim() !== '';

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
        // Snippets use Monaco's snippet syntax, so a $ is either the $0 cursor mark or written \$.
        expect(button.snippet.replace(/\\\$|\$0/g, ''), `${where}: stray $`).not.toContain('$');
        expect(button.snippet.split('$0').length, `${where}: at most one $0`).toBeLessThanOrEqual(2);
      }
    }
  });
}
