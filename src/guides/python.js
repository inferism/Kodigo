// Python's guide buttons. The format is in docs/ARCHITECTURE.md under "Guide buttons".
// The names are meant to be changed, and they fit together: number, name, numbers and answer are the same
// names that the variable, list and input buttons create. Snippets avoid a dollar sign followed by a brace on
// purpose, because Monaco would read the $ as a placeholder.
export default [
  {
    group: 'Output',
    buttons: [
      {
        label: 'print',
        snippet: 'print("$0")',
        explanation:
          'Shows something in the output panel, then moves to a new line. Put text between the quotes, or remove the quotes to show a variable, like print(number).',
      },
      {
        label: 'print with variables',
        snippet: 'print(f"Hello, {name}!")$0',
        explanation:
          'An f-string: the f before the quotes lets you put a variable inside curly braces, and its value is filled in. If name holds "Ana", this shows Hello, Ana! Use the text button first to create name.',
      },
    ],
  },
  {
    group: 'Input',
    buttons: [
      {
        label: 'input (text)',
        snippet: 'answer = input("Type something: ")$0',
        explanation:
          'Shows the question, waits for you to type a line in the output panel and press Enter, then stores what you typed as text in "answer".',
      },
      {
        label: 'input (number)',
        snippet: 'age = int(input("Type a number: "))$0',
        explanation:
          'Like the text input, but int(...) turns what you typed into a whole number, so you can do math with it. What you type always arrives as text, so without int, "5" + 1 gives an error. Use float(...) instead for numbers with decimals.',
      },
    ],
  },
  {
    group: 'Variables',
    buttons: [
      {
        label: 'number',
        snippet: 'number = 0$0',
        explanation:
          'A box that holds a number. "number" is the name and 0 is what it holds at first. You can change the value later with number = number + 1. Python boxes hold any kind of value, so there is no int or double to write.',
      },
      {
        label: 'text',
        snippet: 'name = "text"$0',
        explanation:
          'A box that holds text. Text goes between quotes, either "double" or \'single\'. Join pieces of text with +, like "Hello, " + name.',
      },
    ],
  },
  {
    group: 'Conditions',
    buttons: [
      {
        label: 'if',
        snippet: `if number > 0:
    $0`,
        explanation:
          'Runs the indented code only when the condition is true. The colon at the end of the line is required, and the lines inside must be indented (pushed to the right with spaces). Compare with == (equal), !=, >, <, >= and <=.',
      },
      {
        label: 'if / else',
        snippet: `if number > 0:
    $0
else:
    pass`,
        explanation:
          'Runs the first block when the condition is true, and the else block when it is not. Exactly one of the two runs. pass means "do nothing yet", so replace it with your own code.',
      },
      {
        label: 'if / elif / else',
        snippet: `if number > 0:
    $0
elif number < 0:
    pass
else:
    pass`,
        explanation:
          'Checks several conditions in order and runs the first block that is true. elif is short for "else if". The else block at the end runs when none of the others did.',
      },
    ],
  },
  {
    group: 'Loops',
    buttons: [
      {
        label: 'for loop',
        snippet: `for i in range(10):
    $0`,
        explanation:
          'Repeats the indented code. range(10) counts 0, 1, 2 and so on up to 9, so this runs 10 times, and i holds the current count.',
      },
      {
        label: 'while loop',
        snippet: `while number < 10:
    number += 1$0`,
        explanation:
          'Repeats the indented code for as long as the condition is true. Something inside must change the condition, like number += 1 here (which means add 1 to number), or the loop never ends. If that happens, press Stop.',
      },
      {
        label: 'for each item',
        snippet: `for item in numbers:
    $0`,
        explanation:
          'Goes through a list one item at a time. Each time around, "item" is the next value in "numbers". Use the list button first to create numbers.',
      },
    ],
  },
  {
    group: 'Functions',
    buttons: [
      {
        label: 'def function',
        snippet: `def greet(person):
    return "Hello, " + person$0`,
        explanation:
          'A named piece of code you can run again and again. The names in the parentheses are the values you give it, and return sends a result back. Use it like this: print(greet("Ana")). A function has to be written above the line that uses it.',
      },
    ],
  },
  {
    group: 'Lists',
    buttons: [
      {
        label: 'list',
        snippet: 'numbers = [1, 2, 3]$0',
        explanation:
          'A list of values in order. The first one is numbers[0], the second is numbers[1], and so on. len(numbers) tells you how many there are.',
      },
      {
        label: 'add to list',
        snippet: 'numbers.append(4)$0',
        explanation: 'Adds a value to the end of the list. Use the list button first to create numbers.',
      },
    ],
  },
];

// Plain-English explanations for common errors, shown under the error's own message. A message looks like
// "NameError: name 'x' is not defined". The first entry whose match fits wins, so the specific ones come first.
// example is a real message, and test/guides.spec.js checks that match fits it. test/python.spec.js runs a real
// program for each one and checks that the explanation shows.
export const errors = [
  {
    match: /^IndentationError: expected an indented block/,
    example: "IndentationError: expected an indented block after 'if' statement on line 1",
    explanation:
      'After a line that ends with a colon, the next line must be pushed to the right with spaces (4 is usual). Indent the line under the marked one.',
  },
  {
    match: /^IndentationError: unexpected indent/,
    example: 'IndentationError: unexpected indent',
    explanation:
      'This line is pushed to the right but the line above did not ask for it. Only lines under a line ending with a colon are indented. Remove the extra spaces.',
  },
  {
    match: /^IndentationError: unindent does not match/,
    example: 'IndentationError: unindent does not match any outer indentation level',
    explanation:
      'The spaces at the start of this line do not line up with any earlier line. Lines in the same block need exactly the same number of spaces.',
  },
  {
    match: /^SyntaxError: expected ':'/,
    example: "SyntaxError: expected ':'",
    explanation:
      'A line like if, else, for, while or def must end with a colon (:). Add one at the end of the marked line.',
  },
  {
    match: /^SyntaxError: '[(\[{]' was never closed/,
    example: "SyntaxError: '(' was never closed",
    explanation:
      'A bracket was opened but never closed. Count the ( and ) on the marked line and the lines above it: every opening bracket needs a matching closing one.',
  },
  {
    match: /^SyntaxError: unterminated string literal/,
    example: 'SyntaxError: unterminated string literal (detected at line 1)',
    explanation:
      'A piece of text started with a quote but the closing quote is missing on that line. Add the matching " or \' at the end of the text.',
  },
  {
    match: /^SyntaxError: /,
    example: 'SyntaxError: invalid syntax',
    explanation:
      'Python could not understand this line. Look at the marked line and the one above it for a missing ), a missing comma, a misspelled keyword, or = used where == was meant inside an if.',
  },
  {
    match: /^NameError: name '.+' is not defined/,
    example: "NameError: name 'total' is not defined",
    explanation:
      'Python does not know this name. Common causes: a typo, wrong capital letters (Python cares, so Name is not name), a variable used before the line that creates it, or text written without quotes.',
  },
  {
    match: /^TypeError: can only concatenate str/,
    example: 'TypeError: can only concatenate str (not "int") to str',
    explanation:
      'You tried to join text and a number with +. Turn the number into text first with str(number), or use an f-string like f"Age: {age}".',
  },
  {
    match: /^TypeError: unsupported operand type/,
    example: "TypeError: unsupported operand type(s) for +: 'int' and 'str'",
    explanation:
      'You mixed two kinds of values that cannot be used together here, like a number and text. input() always gives text, so wrap it with int(...) or float(...) before doing math.',
  },
  {
    match: /^ZeroDivisionError/,
    example: 'ZeroDivisionError: division by zero',
    explanation: 'You divided by zero, which is not possible. Check the value you are dividing by, or use an if to avoid it.',
  },
  {
    match: /^IndexError: /,
    example: 'IndexError: list index out of range',
    explanation:
      'You asked for an item that is not in the list. A list with 3 items has positions 0, 1 and 2, so numbers[3] does not exist. Check the number in the square brackets, or use len(numbers).',
  },
  {
    match: /^ValueError: invalid literal for int\(\)/,
    example: "ValueError: invalid literal for int() with base 10: 'abc'",
    explanation:
      'int() can only turn text that looks like a whole number, such as "42", into a number. The text it got was something else, like letters or a decimal point. Check what was typed.',
  },
  {
    match: /^AttributeError: /,
    example: "AttributeError: 'list' object has no attribute 'add'",
    explanation:
      'You used a dot to ask a value for something it does not have. Check the spelling after the dot. For example, a list has append, not add.',
  },
  {
    match: /^ModuleNotFoundError: /,
    example: "ModuleNotFoundError: No module named 'numpy'",
    explanation:
      'This module is not available in Kodigo. Python\'s built-in modules, like math, random and time, work, but add-on packages are not installed. Check the spelling too.',
  },
];
