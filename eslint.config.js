// eslint.config.js — project ESLint configuration
// https://docs.expo.dev/guides/using-eslint/
//
// Extends expo's flat config with rule overrides.
//
// react-hooks/refs is disabled because React Native's Animated.Value uses
// useRef(new Animated.Value(x)).current at the component level — this is the
// officially documented RN idiom and does NOT cause re-render issues since
// Animated.Value is mutated in-place by the API, not by React state.

const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    // Override react-hooks rules — must re-declare the plugin in the same block
    plugins: {
      'react-hooks': expoConfig.find(c => c?.plugins?.['react-hooks'])?.plugins?.['react-hooks'],
    },
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    ignores: ['node_modules/**', 'android/**', 'ios/**', 'dist/**', '.expo/**'],
  },
]);
