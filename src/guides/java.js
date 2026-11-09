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
        snippet: 'java.util.Scanner in = new java.util.Scanner(System.in);$0',
        explanation:
          'Makes a Scanner named "in" that reads what you type in the output panel. Use this button once, before the buttons that read. The long name java.util.Scanner means you need no import line. If you add "import java.util.Scanner;" at the very top of the file, you can write just Scanner.',
      },
      {
        label: 'read a line',
        snippet: 'String line = in.nextLine();$0',
        explanation:
          'Waits until you type a line in the output panel and press Enter, then keeps it as text in "line". It needs the Scanner button first.',
      },
      {
        label: 'read an int',
        snippet: 'int value = in.nextInt();$0',
        explanation:
          'Waits until you type a whole number in the output panel, then keeps it in "value". If you type something that is not a whole number, the program stops with an error. It needs the Scanner button first.',
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
