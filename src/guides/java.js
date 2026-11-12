// Java's guide buttons. The format is in docs/ARCHITECTURE.md under "Guide buttons".
// Snippets are templates: the names are meant to be changed. They also fit together, so number, in and
// numbers are the same names that the variable, Scanner and array buttons create. A snippet that
// starts with "static" is a method and goes inside the class, outside main.
export default [
  {
    group: 'Output',
    buttons: [
      {
        label: 'System.out.print',
        snippet: 'System.out.print("$0");',
        explanation:
          'Shows text in the output panel and stays on the same line, so the next print continues right after it. Put your text between the quotes.',
      },
      {
        label: 'System.out.println',
        snippet: 'System.out.println("$0");',
        explanation:
          'Shows text in the output panel, then moves to a new line. The "ln" stands for "line". Put your text between the quotes.',
      },
    ],
  },
  {
    group: 'Variables',
    buttons: [
      {
        label: 'int',
        snippet: 'int number = 0;$0',
        explanation:
          'A box that holds a whole number, like 7 or -3. "number" is the name of the box and 0 is what it holds at first. You can change both.',
      },
      {
        label: 'double',
        snippet: 'double price = 0.0;$0',
        explanation:
          'A box that holds a number with a decimal point, like 2.5 or 19.99. "price" is the name and 0.0 is the starting value.',
      },
      {
        label: 'String',
        snippet: 'String name = "text";$0',
        explanation:
          'A box that holds text. The text goes between double quotes. Note the capital S: String is written with a capital letter in Java.',
      },
      {
        label: 'boolean',
        snippet: 'boolean isReady = false;$0',
        explanation:
          'A box that holds only true or false. It is useful for answering yes-or-no questions, such as in an if.',
      },
    ],
  },
  {
    group: 'Input',
    buttons: [
      {
        label: 'Scanner',
        snippet: 'Scanner in = new Scanner(System.in);$0',
        imports: ['import java.util.Scanner;'],
        explanation:
          'Makes a Scanner named "in" that reads what you type in the output panel. Use this button once, before the buttons that read. The import line at the top of the file was added for you. Java needs it to know what a Scanner is.',
      },
      {
        label: 'read a line',
        snippet: 'String line = in.nextLine();$0',
        explanation:
          'Waits until you type a line in the output panel and press Enter, then keeps it as text in "line". It needs the Scanner button first.',
      },
      {
        label: 'read an int',
        snippet: `int value = in.nextInt();
in.nextLine(); // finishes the line, so a later nextLine() waits for new text$0`,
        explanation:
          'Waits until you type a whole number in the output panel, then keeps it in "value". If you type something that is not a whole number, the program stops with an error. The second line is needed: nextInt() reads only the number and leaves the Enter you pressed waiting, so without it a following "read a line" would get empty text. It needs the Scanner button first.',
      },
    ],
  },
  {
    group: 'Decisions',
    buttons: [
      {
        label: 'if',
        snippet: `if (number > 0) {
    $0
}`,
        explanation:
          'Runs the code inside the braces only when the condition in the parentheses is true. Here the condition checks whether number is bigger than 0. Change it to what you want to check.',
      },
      {
        label: 'if / else',
        snippet: `if (number > 0) {
    $0
} else {
    // runs when the condition is false
}`,
        explanation:
          'Chooses between two paths. The first braces run when the condition is true, and the else braces run when it is false. Exactly one of them runs.',
      },
    ],
  },
  {
    group: 'Loops',
    buttons: [
      {
        label: 'for loop',
        snippet: `for (int i = 0; i < 10; i++) {
    $0
}`,
        explanation:
          'Repeats the code inside the braces. i starts at 0 and goes up by 1 each time, so this runs 10 times (i = 0 to 9).',
      },
      {
        label: 'while loop',
        snippet: `while (number < 10) {
    $0
    number++;
}`,
        explanation:
          'Repeats the code inside the braces for as long as the condition is true. number++ adds 1 each time, so the loop ends when number reaches 10. If nothing ever makes the condition false, the loop runs forever. Use the Stop button if that happens.',
      },
    ],
  },
  {
    group: 'Methods',
    buttons: [
      {
        label: 'method',
        snippet: `static int add(int a, int b) {
    return a + b;
}$0`,
        explanation:
          'A named piece of code you can use again. This one is called add, takes two whole numbers, and gives back their sum with return. Put it inside the class but outside main, then call it with add(2, 3).',
      },
    ],
  },
  {
    group: 'Arrays',
    buttons: [
      {
        label: 'array',
        snippet: 'int[] numbers = {1, 2, 3};$0',
        explanation:
          'A row of values of the same type, here three whole numbers. Each one has a position that starts at 0, so numbers[0] is 1 and numbers[2] is 3.',
      },
      {
        label: 'for-each over an array',
        snippet: `for (int n : numbers) {
    $0
}`,
        explanation:
          'Goes through every value in the array, one at a time, and puts each one in n. It needs the array button first. Read it as "for each n in numbers".',
      },
    ],
  },
];

// Plain-English explanations for javac's most common errors, shown under javac's own message.
// The first entry whose match fits wins, so the specific ones come before the general ones.
// example is a real javac message, and test/guides.spec.js checks that match fits it.
export const errors = [
  {
    match: /^';' expected$/,
    example: "';' expected",
    explanation:
      'Java wants a semicolon at the end of a statement. Look at the end of the marked line, or the line just above it, for a missing ;',
  },
  {
    match: /^'\)'( or ',')? expected$/,
    example: "')' or ',' expected",
    explanation:
      'A closing parenthesis is missing, or a comma between two values. Count the ( and ) on the line: every ( needs a matching ).',
  },
  {
    match: /^'\{' expected$/,
    example: "'{' expected",
    explanation:
      'An opening brace { is missing. Classes, methods, if statements and loops all put their code between { and }.',
  },
  {
    match: /^cannot find symbol$/,
    example: 'cannot find symbol',
    explanation:
      'Java does not know this name. Common causes: a typo, wrong capital letters (Java cares, so string is not String), a variable that was never created, or one created inside a different { } block. Using Scanner also needs the Scanner button or an import line.',
  },
  {
    match: /^incompatible types: possible lossy conversion from (double|float) to /,
    example: 'incompatible types: possible lossy conversion from double to int',
    explanation:
      'A number with decimals (double) would lose its decimal part inside an int. Use a double variable instead, or cut the decimals on purpose with a cast: (int) 2.5 gives 2.',
  },
  {
    match: /^incompatible types: possible lossy conversion/,
    example: 'incompatible types: possible lossy conversion from long to int',
    explanation:
      'The value could be too big for the smaller type it is going into, such as a long into an int, or an int into a byte. Use the bigger type for the variable, or shrink the value on purpose with a cast like (int) x, which can change the number if it does not fit.',
  },
  {
    match: /^incompatible types: .* cannot be converted to /,
    example: 'incompatible types: String cannot be converted to int',
    explanation:
      'You are putting one kind of value where another kind is expected, like text into an int. Check the type on each side. A condition in if or while must be true or false, and = sets a value while == compares two.',
  },
  {
    match: /^missing return statement$/,
    example: 'missing return statement',
    explanation:
      'This method promises to give back a value, but some way through it ends without a return. Make sure every path reaches a return.',
  },
  {
    match: /^reached end of file while parsing$/,
    example: 'reached end of file while parsing',
    explanation:
      'Java reached the end of your code while still waiting for something, usually a } that is missing. Check that every { has a matching }.',
  },
  {
    match: /^class, interface, enum, or record expected$/,
    example: 'class, interface, enum, or record expected',
    explanation:
      'There is code outside the class, often because an extra } earlier closed the class too soon. Check your braces.',
  },
  {
    // javac gives this when a statement sits outside any class, such as a guide button used above the class.
    match: /^unnamed classes are a preview feature/,
    example: 'unnamed classes are a preview feature and are disabled by default.',
    explanation:
      'Java found code that is not inside a class. Statements like this belong inside a method such as main, between its { and }. If you used a guide button, click inside your code first, where you want the snippet, and then press the button.',
  },
  {
    match: /^variable .* might not have been initialized$/,
    example: 'variable x might not have been initialized',
    explanation: 'A variable is used before it has a value. Give it one when you create it, like int x = 0;',
  },
  {
    match: /^variable .* is already defined/,
    example: 'variable x is already defined in method main(String[])',
    explanation:
      'Two variables have the same name in the same place. Pick a different name, or leave off the type to reuse the first one: x = 2; instead of int x = 2;',
  },
  {
    // javac gives this when a class in the file has the same name as an import, such as a class called Scanner.
    match: /is already defined in this compilation unit$/,
    example: 'Scanner is already defined in this compilation unit',
    explanation:
      'A class in your file has the same name as something you imported, so Java cannot tell them apart. Rename your class to something else, like Main or Program.',
  },
  {
    match: /^unclosed string literal$/,
    example: 'unclosed string literal',
    explanation: 'A piece of text started with a quote, but the closing quote is missing on the same line. Add the closing ".',
  },
  {
    match: /^not a statement$/,
    example: 'not a statement',
    explanation:
      'This line is not an instruction Java can run, like x + 1; on its own. Keep the result (y = x + 1;), print it, or delete the line.',
  },
  {
    match: /^'else' without 'if'$/,
    example: "'else' without 'if'",
    explanation:
      'An else has to come right after the closing } of an if. Check for a missing }, or a ; right after the if condition.',
  },
  {
    match: /^non-static method .* cannot be referenced from a static context$/,
    example: 'non-static method hello() cannot be referenced from a static context',
    explanation:
      'This method belongs to an object, but it was used as if it belonged to the class, which is what main is. If it is your own method, put the word static in front of it, like main has: static void hello(). If it comes from Java, such as nextLine(), call it on an object you made: in.nextLine() and not Scanner.nextLine().',
  },
  {
    match: /^unreported exception /,
    example: 'unreported exception InterruptedException; must be caught or declared to be thrown',
    explanation:
      'This code can fail in a way Java makes you handle. Wrap it in try { ... } catch (Exception e) { ... }, or add throws Exception after the method name and its parentheses.',
  },
  {
    match: /^bad operand types for binary operator /,
    example: "bad operand types for binary operator '-'",
    explanation:
      'That operator does not work with those two kinds of value, like subtracting from text. Check what is on each side. Only + works with text, and it joins the pieces.',
  },
  {
    match: /^unreachable statement$/,
    example: 'unreachable statement',
    explanation:
      'Nothing can ever reach this line, because the code before it (a return, a break or an endless loop) always leaves first. Move or delete the line.',
  },
  {
    match: /cannot be applied to given types/,
    example: 'method add in class Main cannot be applied to given types;',
    explanation:
      'A method was called with the wrong number or kind of values. Compare your call with the method: how many values it takes, and what type each one is.',
  },
];

// Where a button's imports go in a Java file. It returns { row, column, text }, meaning "insert text at this
// exact spot" (both start at 1), or null when every wanted line is already imported. The editor applies it and
// knows nothing about Java. It reads the text the way javac does, skipping comments, strings and text blocks, so an
// import written inside one of those doesn't count, and an import split over several lines does. Imports go right
// after the last import's semicolon, else after the package line's, else at the very start. The exact column
// matters: with "package demo; public class Main {" on one line, the next line would be inside the class.
// shortcut: a comment in the middle of an import declaration isn't handled, and nor is an annotation before package.
export function placeImports(source, imports) {
  const squash = (text) => text.replace(/\s+/g, ''); // "import java.util. List ;" equals "import java.util.List;"
  const have = new Set();
  let line = 1;
  let lineStart = 0; // the index where the current line starts, to turn an index into a column
  let importEnd = null; // { row, column } just after the last import's semicolon
  let packageEnd = null;

  const newline = (k) => {
    line++;
    lineStart = k + 1;
  };
  const count = (from, to) => {
    for (let k = from; k < to; k++) if (source[k] === '\n') newline(k);
  };
  // Returns the index just after closer, or where the text ends. lineOnly stops at the end of the line.
  const skip = (from, closer, { escapes = false, lineOnly = false } = {}) => {
    let k = from;
    while (k < source.length && !source.startsWith(closer, k) && !(lineOnly && source[k] === '\n')) {
      k += escapes && source[k] === '\\' ? 2 : 1;
    }
    const end = source.startsWith(closer, k) ? k + closer.length : k;
    count(from, end);
    return end;
  };

  // A whole Java identifier, so "importé" is one word and not the keyword import followed by an accent.
  const word = /[\p{L}\p{Nd}\p{Nl}\p{Sc}\p{Pc}\p{Mn}\p{Mc}]+/uy;
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    word.lastIndex = i; // a sticky regex starts where lastIndex says, so set it every time
    if (source.startsWith('//', i)) i = skip(i + 2, '\n');
    else if (source.startsWith('/*', i)) i = skip(i + 2, '*/');
    else if (source.startsWith('"""', i)) i = skip(i + 3, '"""', { escapes: true });
    else if (c === '"' || c === "'") i = skip(i + 1, c, { escapes: true, lineOnly: true });
    else if (word.test(source)) {
      const name = source.slice(i, word.lastIndex);
      if (name === 'import' || name === 'package') {
        const end = skip(i + name.length, ';');
        const here = { row: line, column: end - lineStart + 1 };
        if (name === 'import') {
          have.add(squash(source.slice(i, end)));
          importEnd = here;
        } else packageEnd = here;
        i = end;
      } else i += name.length;
    } else {
      if (c === '\n') newline(i);
      i++;
    }
  }

  const missing = imports.filter((wanted) => !have.has(squash(wanted)));
  if (!missing.length) return null;
  const lines = missing.join('\n');
  if (importEnd) return { ...importEnd, text: `\n${lines}` };
  if (packageEnd) return { ...packageEnd, text: `\n\n${lines}` };
  return { row: 1, column: 1, text: `${lines}\n\n` };
}
