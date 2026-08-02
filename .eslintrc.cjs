/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  'extends': [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    // Views are single-word by design — the router maps /blog to Blog.vue, /projects to
    // Projects.vue, and renaming them would break that one-to-one mapping for no benefit.
    'vue/multi-word-component-names': 'off',
    // A leading underscore is the project's marker for "deliberately unused" — omitted destructure
    // keys and required-but-unused middleware parameters.
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // Vuetify's data-table slots are genuinely named `item.<column>`; the dot is part of the slot
    // name, not a Vue modifier.
    'vue/valid-v-slot': ['error', { allowModifiers: true }]
  },
  overrides: [
    {
      // The backend is CommonJS running on Node, not browser ESM.
      files: ['backend/**/*.cjs'],
      env: { node: true, browser: false },
      parserOptions: { sourceType: 'script' }
    }
  ]
}
