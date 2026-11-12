// Each language's guide buttons, keyed by language id. Loaded only when needed.
// Adding a language means adding a line here and a file in src/guides/.
export const guides = {
  java: () => import('./guides/java.js'),
  javascript: () => import('./guides/javascript.js'),
};
