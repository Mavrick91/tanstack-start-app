export default {
  contextSeparator: '_',
  // Key separator that will be used to separate keys in JSON file
  // Setting it to false because we use flat keys (English sentences)
  keySeparator: false,

  // Namespace separator that will be used to separate namespaces in JSON file
  // Setting it to false because we don't use namespaces currently
  nsSeparator: false,

  pluralSeparator: '_',
  interpolation: {
    prefix: '{{',
    suffix: '}}',
  },

  // Default value to use for new keys
  // We return the key itself for English, and a labeled placeholder for other languages
  defaultValue: (locale, namespace, key) => {
    return locale === 'en' ? key : `__NOT_GENERATED: ${key}__`
  },

  // Locales to generate
  locales: ['en', 'fr', 'id'],

  // Expression to find within the source code
  lexers: {
    ts: ['JsxLexer'],
    tsx: ['JsxLexer'],
    js: ['JsxLexer'],
    jsx: ['JsxLexer'],
    default: ['JsxLexer'],
  },

  // Where to write the output files
  output: 'src/i18n/locales/$LOCALE.json',

  // Where to look for keys
  input: ['src/**/*.{ts,tsx}'],

  // Keep existing keys in the output files
  keepRemoved: true,

  // Sort keys alphabetically
  sort: true,

  // Use a custom JSON indentation
  indentation: 2,
}
