import tseslint from 'typescript-eslint';
export default [
 {ignores:['**/node_modules/**','**/dist/**','**/build/**','**/android/**','.tools/**','.gradle-user-home/**','tmp/**','docs/**']},
 {files:['**/*.ts','**/*.tsx'],languageOptions:{parser:tseslint.parser,parserOptions:{ecmaVersion:'latest',sourceType:'module',ecmaFeatures:{jsx:true}}},rules:{
  'constructor-super':'error','no-async-promise-executor':'error','no-constant-binary-expression':'error','no-dupe-args':'error','no-dupe-else-if':'error','no-dupe-keys':'error','no-duplicate-case':'error','no-fallthrough':'error','no-self-assign':'error','no-unreachable':'error','no-unsafe-finally':'error','use-isnan':'error','valid-typeof':'error'
 }}
];
