// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/functions/*'],
  },
  {
    // eslint-config-expo 57 turned on the React Compiler diagnostics as errors. The existing code
    // predates them (Date.now()/ref reads in render, shared-value writes); kept visible as warnings
    // until each site is reviewed, instead of rewriting behaviour during the SDK upgrade.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
