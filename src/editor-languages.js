// Monaco's highlighting for each language, keyed by language id. Only the compiler page imports this,
// so the home page still loads no Monaco. Adding a language means adding a line here.
export const editorLanguages = {
  java: () => import('monaco-editor/languages/definitions/java/register'),
};
