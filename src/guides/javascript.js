// JavaScript's guide buttons. The format is in docs/ARCHITECTURE.md under "Guide buttons".
// The names are meant to be changed, and they fit together: number, name, numbers and answer are the same
// names that the variable, array and input buttons create. Snippets avoid ${...} on purpose, because Monaco
// would read the $ as a placeholder.
export default [
  {
    group: 'Output',
    buttons: [
      {
        label: 'console.log',
        snippet: 'console.log("$0");',
        explanation:
          'Shows something in the output panel, then moves to a new line. Put text between the quotes, or remove the quotes to show a variable, like console.log(number).',
      },
    ],
  },
  {
    group: 'Input',
    buttons: [
      {
        label: 'input (text)',
        snippet: 'const answer = await input("Type something: ");$0',
        explanation:
          'Shows the question, waits for you to type a line in the output panel and press Enter, then stores what you typed as text in "answer". The await is needed: it makes the program wait for you. input is a Kodigo helper, so it only works here.',
      },
      {
        label: 'input (number)',
        snippet: 'const age = Number(await input("Type a number: "));$0',
        explanation:
          'Like the text input, but Number(...) turns what you typed into a real number, so you can do math with it. What you type always arrives as text, so without Number, "5" + 1 gives "51".',
      },
    ],
  },
  {
    group: 'Variables',
    buttons: [
      {
        label: 'let',
        snippet: 'let number = 0;$0',
        explanation:
          'A box whose value can change later, like number = number + 1. "number" is the name and 0 is what it holds at first. JavaScript boxes hold any kind of value, so there is no int or double.',
      },
      {
        label: 'const',
        snippet: 'const name = "text";$0',
        explanation:
          'A box whose value can never change after you set it. Use const when the value stays the same, and let when it will change. Trying to change a const gives an error.',
      },
    ],
  },
  {
    group: 'Conditions',
    buttons: [
      {
        label: 'if',
        snippet: `if (number > 0) {
    $0
}`,
        explanation:
          'Runs the code inside the braces only when the condition in the parentheses is true. Compare with === (equal), !== (not equal), >, <, >= and <=. Use === rather than ==, because === also checks the kind of value.',
      },
      {
        label: 'if / else',
        snippet: `if (number > 0) {
    $0
} else {

}`,
        explanation:
          'Runs the first block when the condition is true, and the else block when it is not. Exactly one of the two runs.',
      },
    ],
  },
  {
    group: 'Loops',
    buttons: [
      {
        label: 'for loop',
        snippet: `for (let i = 0; i < 10; i++) {
    $0
}`,
        explanation:
          'Repeats the code inside the braces. i starts at 0 and goes up by 1 each time, so this runs 10 times (i = 0 to 9).',
      },
      {
        label: 'while loop',
        snippet: `while (number < 10) {
    number++;$0
}`,
        explanation:
          'Repeats the code inside the braces for as long as the condition is true. Something inside must change the condition, like number++ here, or the loop never ends. If that happens, press Stop.',
      },
      {
        label: 'for...of loop',
        snippet: `for (const item of numbers) {
    $0
}`,
        explanation:
          'Goes through a list one item at a time. Each time around, "item" is the next value in "numbers". Use the array button first to create numbers.',
      },
    ],
  },
  {
    group: 'Functions',
    buttons: [
      {
        label: 'function',
        snippet: `function greet(person) {
    return "Hello, " + person;$0
}`,
        explanation:
          'A named piece of code you can run again and again. The names in the parentheses are the values you give it, and return sends a result back. Use it like this: console.log(greet("Ana")). Write it anywhere in the file, even below the line that uses it.',
      },
      {
        label: 'arrow function',
        snippet: 'const double = (value) => value * 2;$0',
        explanation:
          'A shorter way to write a small function. The names before the arrow => are the values it takes, and the part after is what it gives back. Use it like this: console.log(double(4)).',
      },
    ],
  },
  {
    group: 'Arrays',
    buttons: [
      {
        label: 'array',
        snippet: 'const numbers = [1, 2, 3];$0',
        explanation:
          'A list of values in order. The first one is numbers[0], the second is numbers[1], and so on. numbers.length tells you how many there are.',
      },
      {
        label: 'add to array',
        snippet: 'numbers.push(4);$0',
        explanation:
          'Adds a value to the end of the list. You can do this even though numbers is a const, because the box still holds the same list. Only replacing the whole list is not allowed.',
      },
    ],
  },
  {
    group: 'Waiting',
    buttons: [
      {
        label: 'setTimeout',
        snippet: `setTimeout(() => {
    $0
}, 1000);`,
        explanation:
          'Runs the code inside the braces once, after waiting. The number is in milliseconds, so 1000 is one second. The lines after setTimeout do not wait: they run right away, and this code runs later.',
      },
    ],
  },
];

// Plain-English explanations for common errors, shown under the error's own message.
// The first entry whose match fits wins, so the specific ones come before the general ones.
// example is a real message, and test/guides.spec.js checks that match fits it.
export const errors = [
  {
    match: /^(prompt|alert|confirm) is not defined$/,
    example: 'prompt is not defined',
    explanation:
      'Kodigo runs JavaScript on its own, not inside a web page, so the pop-up boxes do not exist. Use console.log to show something, and await input("question") to ask for something.',
  },
  {
    match: /^(document|window|localStorage) is not defined$/,
    example: 'document is not defined',
    explanation:
      'Kodigo runs JavaScript without a web page, so there is no document or window to use. Everything shows in the output panel with console.log.',
  },
  {
    match: /^\w+ is not defined$/,
    example: 'total is not defined',
    explanation:
      'JavaScript does not know this name. Common causes: a typo, wrong capital letters (JavaScript cares, so Name is not name), a variable that was never created with let or const, or one created inside a different { } block.',
  },
  {
    match: /^Assignment to constant variable/,
    example: 'Assignment to constant variable.',
    explanation:
      'You tried to change a box made with const, and a const can never change. If the value needs to change, create it with let instead.',
  },
  {
    match: /^Cannot read propert(y|ies) of (undefined|null)/,
    example: "Cannot read properties of undefined (reading 'length')",
    explanation:
      'You asked for something inside a value that is not there. The thing before the dot is undefined or null, often because of a wrong name, a missing item (like numbers[10] in a short list), or a function that forgot to return.',
  },
  {
    match: /^.+ is not a function$/,
    example: 'numbers.add is not a function',
    explanation:
      'You called something with ( ), but it is not a function. Check the spelling and capital letters of the name. For example, a list has push, not add.',
  },
  {
    match: /^Maximum call stack size exceeded$/,
    example: 'Maximum call stack size exceeded',
    explanation:
      'A function kept calling itself and never stopped. Check that a function which calls itself has a condition that ends it.',
  },
  {
    match: /^Identifier '.+' has already been declared$/,
    example: "Identifier 'number' has already been declared",
    explanation:
      'You created two boxes with the same name in the same place. Give one a different name, or remove let or const from the second one to change the value instead of creating it again.',
  },
  {
    match: /^Unterminated string constant$/,
    example: 'Unterminated string constant',
    explanation:
      'A piece of text started with a quote but the closing quote is missing on that line. Add the matching " or \' at the end of the text.',
  },
  {
    match: /^Unexpected token/,
    example: 'Unexpected token',
    explanation:
      'JavaScript found something it did not expect at the marked spot. Look at the marked line and the line above it for a missing ), ] or }, a missing comma, or a value that was left out, like let x = ;',
  },
];
