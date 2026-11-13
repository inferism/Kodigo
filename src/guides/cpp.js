// C++'s guide buttons. The format is in docs/ARCHITECTURE.md under "Guide buttons".
// Snippets are templates: the names are meant to be changed. They also fit together, so number, price, name,
// isReady and numbers are the names that the variable buttons create. The function button goes above main.
// Snippets write std:: in full, like the starter program, so they work with or without "using namespace std;".
import { sharedErrors } from './clang-shared.js';

export { placeImports } from './clang-shared.js';

const iostream = ['#include <iostream>'];

export default [
  {
    group: 'Output',
    buttons: [
      {
        label: 'cout',
        snippet: 'std::cout << "$0" << std::endl;',
        imports: iostream,
        explanation:
          'Shows text in the output panel. Put your text between the quotes. std::endl ends the line, so the next output starts on a new one. Leave it out to stay on the same line.',
      },
      {
        label: 'cout a variable',
        snippet: 'std::cout << "Number: " << number << std::endl;$0',
        imports: iostream,
        explanation: 'Shows text and a value together. Each << adds the next piece, so you can mix text in quotes with variables.',
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
        label: 'string',
        snippet: 'std::string name = "text";$0',
        imports: ['#include <string>'],
        explanation:
          'A box that holds text. The text goes between double quotes. The #include <string> line at the top was added for you.',
      },
      {
        label: 'bool',
        snippet: 'bool isReady = false;$0',
        explanation: 'A box that holds only true or false. It is useful for answering yes-or-no questions, such as in an if.',
      },
    ],
  },
  {
    group: 'Input',
    buttons: [
      {
        label: 'read a number',
        snippet: 'std::cin >> number;$0',
        imports: iostream,
        explanation:
          'Waits for you to type a number in the output panel and stores it in number. The arrows point into the variable: >> for cin, << for cout.',
      },
      {
        label: 'read a word',
        snippet: 'std::cin >> name;$0',
        imports: iostream,
        explanation: 'Reads one word into name. It stops at a space, so "Ana Cruz" gives only "Ana". Use "read a line" for text with spaces.',
      },
      {
        label: 'read a line',
        snippet: 'std::getline(std::cin >> std::ws, name);$0',
        imports: ['#include <iostream>', '#include <string>'],
        explanation:
          'Reads a whole line, spaces included, into name. The std::ws part skips the Enter left behind by an earlier cin >>, which would otherwise make getline read an empty line.',
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
      {
        label: 'for each',
        snippet: 'for (int value : numbers) {\n    std::cout << value << std::endl;$0\n}',
        imports: iostream,
        explanation: 'Visits every item in numbers, one at a time, as value. You don\'t need positions or a size, so it can\'t go past the end.',
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
    group: 'Vectors',
    buttons: [
      {
        label: 'vector',
        snippet: 'std::vector<int> numbers = {1, 2, 3};$0',
        imports: ['#include <vector>'],
        explanation:
          'A list of ints that can grow. Positions start at 0, so numbers[0] is the first. numbers.size() tells how many items it has. The #include <vector> line was added for you.',
      },
      {
        label: 'add to vector',
        snippet: 'numbers.push_back(4);$0',
        explanation: 'Adds 4 to the end of numbers, so it grows by one item.',
      },
    ],
  },
];

export const errors = [
  {
    match: /^use of undeclared identifier '\w+'; did you mean 'std::/,
    example: "use of undeclared identifier 'cout'; did you mean 'std::cout'?",
    explanation:
      'This name lives in the std namespace, so write std:: before it, like std::cout. Or add the line using namespace std; under the #include lines.',
  },
  {
    match: /^unknown type name '\w+'; did you mean 'std::/,
    example: "unknown type name 'string'; did you mean 'std::string'?",
    explanation: 'This type lives in the std namespace, so write std:: before it, like std::string. Or add using namespace std; under the #include lines.',
  },
  {
    match: /^cannot use '(try|throw)' with exceptions disabled/,
    example: "cannot use 'try' with exceptions disabled",
    explanation:
      "Kodigo's C++ can't use exceptions yet (try, throw and catch), because the compiler that runs in your browser is built without them. Check for problems with an if instead.",
  },
  {
    match: /^invalid operands to binary expression/,
    example: "invalid operands to binary expression ('ostream' (aka 'basic_ostream<char>') and 'int')",
    explanation:
      'These two values can\'t be used with this operator. A common cause is arrows the wrong way: cout uses << and cin uses >>.',
  },
  {
    match: /^no viable conversion from/,
    example: "no viable conversion from 'int' to 'std::string' (aka 'basic_string<char>')",
    explanation: 'A value of the wrong type was put in this variable, such as a number in a string. Text needs double quotes, like "5".',
  },
  {
    match: /^no member named '/,
    example: "no member named 'size2' in 'std::string'",
    explanation: 'This thing has nothing with that name after the dot. Check the spelling, such as size() or push_back().',
  },
  {
    match: /^no matching function for call to '/,
    example: "no matching function for call to 'greet'",
    explanation:
      'The function exists, but not for these values. Check how many values you pass and their types, compared with the function\'s definition.',
  },
  ...sharedErrors,
];
