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
  {
    id: 'python',
    label: 'Python',
    monaco: 'python',
    blurb: 'Run Python 3.14 in your browser, with input().',
    href: '/compiler/?lang=python',
    starter: 'print("Hello, Kodigo!")\n',
  },
  {
    id: 'c',
    label: 'C',
    monaco: 'c',
    blurb: 'Compile and run C with the real clang compiler.',
    href: '/compiler/?lang=c',
    starter: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, Kodigo!\\n");\n    return 0;\n}\n',
  },
  {
    id: 'cpp',
    label: 'C++',
    monaco: 'cpp',
    blurb: 'Compile and run C++ with the real clang compiler.',
    href: '/compiler/?lang=cpp',
    starter: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, Kodigo!" << std::endl;\n    return 0;\n}\n',
  },
];
