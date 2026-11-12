// Checks that every guide data file matches the format in docs/ARCHITECTURE.md. Runs in Node, no page needed.
import { test, expect } from '@playwright/test';
import { guides } from '../src/guide-map.js';
import { parse } from 'acorn';
import { placeImports } from '../src/guides/java.js';

const filled = (value) => typeof value === 'string' && value.trim() !== '';

// Counts real $0 cursor marks using Monaco's escapes (\$, \\ and \} are literal text).
// Returns -1 for any other unescaped $, such as $1 or $01, which Monaco would read as a placeholder.
function cursorMarks(snippet) {
  let marks = 0;
  for (let i = 0; i < snippet.length; i++) {
    if (snippet[i] === '\\' && '$}\\'.includes(snippet[i + 1])) i++;
    else if (snippet[i] === '$') {
      if (snippet[i + 1] !== '0' || /\d/.test(snippet[i + 2] ?? '')) return -1;
      marks++;
      i++;
    }
  }
  return marks;
}

test('the cursor mark check follows Monaco escapes', () => {
  expect(cursorMarks('no marks')).toBe(0);
  expect(cursorMarks('a $0 b')).toBe(1);
  expect(cursorMarks('// \\$0 then $0')).toBe(1); // an escaped \$0 is text, not a second cursor
  expect(cursorMarks('$0 $0')).toBe(2);
  expect(cursorMarks('$01')).toBe(-1); // Monaco reads this as placeholder 1
  expect(cursorMarks('\\\\$1')).toBe(-1); // \\ is an escaped backslash, so $1 is a real placeholder
  expect(cursorMarks('$1')).toBe(-1);
  expect(cursorMarks('cost: $')).toBe(-1);
});

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
        if (button.imports !== undefined) {
          expect(Array.isArray(button.imports) && button.imports.every(filled), `${where}: imports is a list of non-empty lines`).toBe(true);
        }
        const marks = cursorMarks(button.snippet);
        expect(marks, `${where}: a $ that isn't $0 must be written \\$`).not.toBe(-1);
        expect(marks, `${where}: at most one $0`).toBeLessThanOrEqual(1);
      }
    }
  });

  test(`${id} error explanations have the right shape`, async () => {
    const errors = (await load()).errors ?? [];
    for (const error of errors) {
      const where = `error: ${error.example}`;
      expect(error.match instanceof RegExp, `${where}: match is a regex`).toBe(true);
      expect(error.match.global || error.match.sticky, `${where}: no g or y flag, which would make test() remember its place`).toBe(false);
      expect(filled(error.explanation), `${where}: explanation`).toBe(true);
      // Entries are tried in order, so an earlier, broader one must not swallow this example.
      expect(errors.find((e) => e.match.test(error.example)), `${where}: first match for its own example`).toBe(error);
    }
  });
}

// Java's placeImports reads the text like javac does, so it's tested here in Node with the awkward cases.
// It returns the exact spot to insert at: just after the last import's (or the package line's) semicolon.
const scanner = 'import java.util.Scanner;';
const wanted = [scanner];
const top = { row: 1, column: 1, text: `${scanner}\n\n` };
// The line is the whole text of the line that holds the semicolon, so the column is just past its end.
const afterImport = (row, line) => ({ row, column: line.length + 1, text: `\n${scanner}` });
const afterPackage = (row, line) => ({ row, column: line.length + 1, text: `\n\n${scanner}` });

for (const [name, source, expected] of [
  ['no imports and no package: the very start, then a blank line', 'class A {}', top],
  ['already imported: nothing to add', `${scanner}\nclass A {}`, null],
  ['after the last import', 'import java.util.List;\nimport java.io.File;\nclass A {}', afterImport(2, 'import java.io.File;')],
  ['after the package line, with a blank line before', 'package a.b;\n\nclass A {}', afterPackage(1, 'package a.b;')],
  ['after the last import when there is also a package line', 'package a;\nimport java.util.List;\nclass A {}', afterImport(2, 'import java.util.List;')],
  ['an import split over two lines is one import', 'import java.util.\n    List;\nclass A {}', afterImport(2, '    List;')],
  ['an import split over two lines can be the one wanted', 'import java.util.\n    Scanner;\nclass A {}', null],
  ['odd spacing still matches', 'import   java.util.Scanner  ;\nclass A {}', null],
  ['a block comment is not an import', `/*\n${scanner}\n*/\nclass A {}`, top],
  ['a commented-out other import is not a place to add one', '/*\nimport java.util.List;\n*/\nclass A {}', top],
  ['a line comment is not an import', `// ${scanner}\nclass A {}`, top],
  ['a text block is not an import', `class A { String s = """\n${scanner}\n"""; }`, top],
  ['an escaped quote inside a string does not confuse the scan', 'import java.util.List;\nclass A { String s = "a \\" b"; }', afterImport(1, 'import java.util.List;')],
  ['a wildcard import does not count as the specific one', 'import java.util.*;\nclass A {}', afterImport(1, 'import java.util.*;')],
  ['a static import is a different import', 'import static java.lang.Math.*;\nclass A {}', afterImport(1, 'import static java.lang.Math.*;')],
  ['an empty file', '', top],
  ['an identifier that starts with the word import is not an import', 'class A { void m() { int importé = 1; } }', top],
  ['an identifier that ends with the word import is not an import', 'class A { void m() { int éimport = 1; } }', top],
  ['an identifier that starts with the word package is not a package line', 'class A { void m() { int packageé = 1; } }', top],
  ['two imports with a comment between them on one line are both seen', 'import java.util.List;/**/import java.io.File;\nclass A {}', afterImport(1, 'import java.util.List;/**/import java.io.File;')],
  ['the second import is the one wanted, after a comment', `import java.util.List;/**/${scanner}\nclass A {}`, null],
  // The class shares the line with the package or import, so "the next line" would be inside the class.
  ['a package line that shares its line with the class', 'package demo; public class Main {\n}', afterPackage(1, 'package demo;')],
  ['an import that shares its line with the class', 'import java.util.List; class A {}', afterImport(1, 'import java.util.List;')],
  ['a package and an import that share a line with the class', 'package demo; import java.util.List; class A {}', afterImport(1, 'package demo; import java.util.List;')],
  ['Windows line endings', 'import java.util.List;\r\nclass A {}', afterImport(1, 'import java.util.List;')],
]) {
  test(`java placeImports: ${name}`, () => {
    expect(placeImports(source, wanted)).toEqual(expected);
  });
}

test('java placeImports adds only the lines that are missing, in order', () => {
  const edit = placeImports('import java.util.List;\nclass A {}', ['import java.util.List;', scanner, 'import java.io.File;']);
  expect(edit).toEqual({ row: 1, column: 'import java.util.List;'.length + 1, text: `\n${scanner}\nimport java.io.File;` });
});

// A broken snippet would teach students something wrong, so every JavaScript button must parse. They build on each
// other (number, numbers, answer), so they go into one program in file order, parsed with the same options as the runner.
test('every JavaScript guide snippet parses when used together', async () => {
  const buttons = (await guides.javascript()).default.flatMap((g) => g.buttons);
  const program = buttons.map((b) => b.snippet.replace('$0', '')).join('\n');
  expect(() => parse(program, { ecmaVersion: 'latest', allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true })).not.toThrow();
});
