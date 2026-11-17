const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/**',
      'build/**',
      'release/**',
      'web-dist/**',
      'native-dist/**',
      'site-demo/app/**',
    ],
  },
]);
