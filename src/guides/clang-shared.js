// Shared by the C and C++ guides (src/guides/c.js and cpp.js). See "Guide buttons" in docs/ARCHITECTURE.md.

// Adds the #include lines a button needs that the file doesn't have yet. Returns { row, column, text } (counted
// from 1), or null when nothing is missing. New lines go right after the last #include, or at the very top.
// Includes inside /* */ comments don't count. Known limit: an #include inside #if 0 still counts.
export function placeImports(source, includes) {
  const header = (line) => line.match(/^\s*#\s*include\s*([<"][^>"]+[>"])/)?.[1];
  const lines = source.split('\n').map((line) => line.replace(/\r$/, ''));
  const have = new Set();
  let last = -1;
  let inComment = false;
  lines.forEach((line, i) => {
    let code = line;
    if (inComment) {
      const end = code.indexOf('*/');
      if (end === -1) return;
      code = code.slice(end + 2);
      inComment = false;
    }
    const found = header(code);
    if (found) {
      have.add(found);
      last = i;
    }
    const open = code.lastIndexOf('/*');
    if (open !== -1 && code.indexOf('*/', open) === -1) inComment = true;
  });
  const missing = includes.filter((line) => !have.has(header(line)));
  if (!missing.length) return null;
  if (last === -1) return { row: 1, column: 1, text: `${missing.join('\n')}\n\n` };
  return { row: last + 1, column: lines[last].length + 1, text: `\n${missing.join('\n')}` };
}

// Explanations for clang errors that C and C++ share. Each file puts its own, more specific ones first,
// because the first match wins. The examples are real clang 22 messages (the text after "error: ").
export const sharedErrors = [
  {
    match: /^expected ';'/,
    example: "expected ';' after expression",
    explanation:
      'A statement is missing its semicolon at the end. In C and C++ most lines end with ;. Look at the end of this line, or of the line just before it.',
  },
  {
    match: /^expected '}'/,
    example: "expected '}'",
    explanation:
      'A { was opened but never closed. Every { needs a matching }. Count them in your if, loops and functions; the missing one is usually earlier than the line shown.',
  },
  {
    match: /^expected '\)'/,
    example: "expected ')'",
    explanation: 'A ( was opened but not closed. Check that every ( on this line has a matching ).',
  },
  {
    match: /^expected expression/,
    example: 'expected expression',
    explanation:
      'Something is missing where a value should be. Common causes: a string with no closing " quote, an else after an if that ends in ; (like if (x > 0);), or an operator with nothing after it.',
  },
  {
    match: /^use of undeclared identifier '/,
    example: "use of undeclared identifier 'count'",
    explanation:
      'This name was never made. Check the spelling (capital letters matter), and that the variable is declared before this line and inside the same { } block.',
  },
  {
    match: /^redefinition of '/,
    example: "redefinition of 'x'",
    explanation:
      'This name was already made earlier in the same block. Remove the type (like int) to change the existing variable, or pick a different name.',
  },
  {
    match: /^too (few|many) arguments to function call/,
    example: 'too few arguments to function call, expected 2, have 1',
    explanation:
      'The function was called with the wrong number of values. Give it one value for each parameter in its definition, in the same order.',
  },
  {
    match: /^non-void function '.+' should return a value/,
    example: "non-void function 'main' should return a value [-Wreturn-mismatch]",
    explanation:
      'This function promises to give back a value (its type is not void), so return needs one, like return 0;.',
  },
];
