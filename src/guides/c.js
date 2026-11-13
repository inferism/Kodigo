// C's guide buttons. The format is in docs/ARCHITECTURE.md under "Guide buttons".
// Snippets are templates: the names are meant to be changed. They also fit together, so number, price, letter,
// name and numbers are the names that the variable buttons create. The function button goes above main.
import { sharedErrors } from './clang-shared.js';

export { placeImports } from './clang-shared.js';

const stdio = ['#include <stdio.h>'];

export default [
  {
    group: 'Output',
    buttons: [
      {
        label: 'printf',
        snippet: 'printf("$0\\n");',
        imports: stdio,
        explanation:
          'Shows text in the output panel. Put your text between the quotes. \\n at the end means "new line", so the next output starts on the next line. Leave it out to stay on the same line.',
      },
      {
        label: 'printf a number',
        snippet: 'printf("Number: %d\\n", number);$0',
        imports: stdio,
        explanation:
          'Shows text with a value inside it. %d is a placeholder that gets replaced by the int after the comma. Use %f for a double, %c for a char and %s for text.',
      },
      {
        label: 'printf a decimal',
        snippet: 'printf("Price: %.2f\\n", price);$0',
        imports: stdio,
        explanation:
          'Shows a double with 2 digits after the decimal point. %.2f means "a decimal number, rounded to 2 places". Change the 2 for more or fewer digits.',
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
        explanation: 'A box that holds a number with a decimal point, like 2.5 or 19.99. "price" is the name and 0.0 is the starting value.',
      },
      {
        label: 'char',
        snippet: "char letter = 'A';$0",
        explanation: "A box that holds one character, like 'A' or '7'. A single character goes between single quotes.",
      },
      {
        label: 'text (char array)',
        snippet: 'char name[50] = "text";$0',
        explanation:
          'C has no string type, so text is kept in an array of chars. [50] means it has room for 49 characters plus one hidden end marker. Text goes between double quotes.',
      },
    ],
  },
  {
    group: 'Input',
    buttons: [
      {
        label: 'read an int',
        snippet: 'scanf("%d", &number);$0',
        imports: stdio,
        explanation:
          'Waits for you to type a whole number in the output panel and stores it in number. The & is needed: it tells scanf where the box is. Forgetting it is a very common mistake and makes the program crash.',
      },
      {
        label: 'read a double',
        snippet: 'scanf("%lf", &price);$0',
        imports: stdio,
        explanation: 'Waits for a decimal number and stores it in price. Reading a double uses %lf (the letter l, then f), and it needs the & too.',
      },
      {
        label: 'read a word',
        snippet: 'scanf("%49s", name);$0',
        imports: stdio,
        explanation:
          'Reads one word (it stops at a space) into name. No & here, because an array already says where it is. The 49 stops it from writing past the 50 spaces of name.',
      },
      {
        label: 'read a line',
        snippet: 'fgets(name, sizeof name, stdin);\nname[strcspn(name, "\\n")] = \'\\0\';$0',
        imports: ['#include <stdio.h>', '#include <string.h>'],
        explanation:
          'Reads a whole line, spaces included, into name. fgets keeps the Enter at the end, so the second line removes it. After a scanf that read a number, the Enter is still waiting, so fgets would read an empty line: add getchar(); before it.',
      },
    ],
  },
  {
    group: 'Conditions',
    buttons: [
      {
        label: 'if',
        snippet: 'if (number > 0) {\n    $0\n}',
        explanation: 'Runs the code inside the braces only when the condition in brackets is true. Use == to compare (a single = changes the value instead).',
      },
      {
        label: 'if / else',
        snippet: 'if (number > 0) {\n    $0\n} else {\n    \n}',
        explanation: 'Runs the first block when the condition is true, and the else block when it is false. Exactly one of them runs.',
      },
      {
        label: 'else if',
        snippet: 'if (number > 0) {\n    $0\n} else if (number < 0) {\n    \n} else {\n    \n}',
        explanation: 'Checks the conditions from top to bottom and runs the first block whose condition is true. The last else runs when none are.',
      },
      {
        label: 'switch',
        snippet: 'switch (number) {\n    case 1:\n        $0\n        break;\n    default:\n        break;\n}',
        explanation:
          'Picks a case by the value of number. break ends the case; without it the code falls into the next case too. default runs when no case matches.',
      },
    ],
  },
  {
    group: 'Loops',
    buttons: [
      {
        label: 'for loop',
        snippet: 'for (int i = 0; i < 10; i++) {\n    $0\n}',
        explanation: 'Repeats the code inside the braces. i starts at 0 and goes up by 1 each time, so this runs 10 times (i = 0 to 9).',
      },
      {
        label: 'while loop',
        snippet: 'while (number < 10) {\n    $0\n    number++;\n}',
        explanation:
          'Repeats while the condition is true, checking it before each round. Something inside must change (here number++), or it loops forever. If that happens, press Stop.',
      },
      {
        label: 'do while loop',
        snippet: 'do {\n    $0\n} while (number < 10);',
        explanation: 'Like a while loop, but the check comes after each round, so the code always runs at least once. Note the ; at the end.',
      },
    ],
  },
  {
    group: 'Functions',
    buttons: [
      {
        label: 'function',
        snippet: 'int add(int a, int b) {\n    return a + b;$0\n}',
        explanation:
          'A named piece of code you can use again. Put it above main, outside of it. This one takes two ints and gives back their sum, so add(2, 3) is 5. Use void instead of int if it gives nothing back.',
      },
    ],
  },
  {
    group: 'Arrays',
    buttons: [
      {
        label: 'array',
        snippet: 'int numbers[5] = {1, 2, 3, 4, 5};$0',
        explanation:
          'A row of 5 ints under one name. Positions start at 0, so numbers[0] is the first and numbers[4] is the last. Reading numbers[5] goes past the end.',
      },
      {
        label: 'loop over an array',
        snippet: 'for (int i = 0; i < 5; i++) {\n    printf("%d\\n", numbers[i]);$0\n}',
        imports: stdio,
        explanation: 'Visits every position of numbers, from 0 to 4, and prints each value. The 5 must match the size of the array.',
      },
    ],
  },
];

export const errors = [
  {
    match: /^call to undeclared library function '/,
    example: "call to undeclared library function 'printf' with type 'int (const char *, ...)'; ISO C99 and later do not support implicit function declarations [-Wimplicit-function-declaration]",
    explanation:
      'This function comes with C, but its #include line is missing at the top. printf and scanf need #include <stdio.h>, and strlen and strcpy need #include <string.h>.',
  },
  {
    match: /^call to undeclared function '/,
    example: "call to undeclared function 'prinf'; ISO C99 and later do not support implicit function declarations [-Wimplicit-function-declaration]",
    explanation:
      'C does not know a function with this name. Check the spelling. If it is your own function, put it above main, because C reads the file from top to bottom.',
  },
  {
    match: /^use of undeclared identifier 'string'/,
    example: "use of undeclared identifier 'string'",
    explanation: 'C has no string type. Keep text in a char array instead, like char name[50] = "Ana";.',
  },
  {
    match: /^incompatible pointer to integer conversion/,
    example: "incompatible pointer to integer conversion initializing 'int' with an expression of type 'char[5]' [-Wint-conversion]",
    explanation:
      'Text in double quotes was put where a number or a single char belongs. A number has no quotes (5), a char uses single quotes (\'A\'), and text needs a char array.',
  },
  ...sharedErrors,
];
