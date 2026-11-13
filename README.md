# Kodigo

A free online compiler that comes with guides. Write code, run it in your browser, and learn as you go, with nothing to install.

**Status:** Java, JavaScript, Python, C and C++ work end to end, each with guide buttons. You can open the site, pick a language, build a program with guide buttons, and run it.

## Works now

- Java 21, compiled and run in your browser with the real `javac`
- JavaScript, Python 3.14 (Pyodide), and C and C++ (the real clang compiler), all running in your browser
- Output and errors shown separately, and compile errors get red marks in the editor, clickable line numbers, and a plain-English explanation of common errors
- Programs that read input with `Scanner`: type the input in the output panel, like a console
- Guide buttons on the right of the editor that insert code, like a `for` loop or a `Scanner`, each with a dropdown arrow that explains it
- A Stop button for programs that never finish
- A layout for phones, where the guide is a drawer at the bottom
- Light and dark themes: the site is dark until you press the toggle, and the choice is remembered on your device
- A warning before you close or refresh with unsaved changes. Nothing is saved, and the editor always starts from the starter code
- Code runs in your browser and is never sent to a server

See the [roadmap](docs/ROADMAP.md) for the current plan and [architecture](docs/ARCHITECTURE.md) for how it works.
