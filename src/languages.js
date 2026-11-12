// One entry per language. The id matches the runner's id in src/runners.
// monaco is the language name the editor uses for highlighting.
export const languages = [
  {
    id: 'java',
    label: 'Java',
    monaco: 'java',
    blurb: 'Compile and run Java 21 with the real compiler.',
    href: '/compiler/?lang=java',
    starter: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Kodigo!");\n    }\n}\n',
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    monaco: 'javascript',
    blurb: 'Run JavaScript in your browser, with input and timers.',
    href: '/compiler/?lang=javascript',
    starter: 'console.log("Hello, Kodigo!");\n',
  },
];
