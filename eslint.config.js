import ESLintTSConfig from "@fimion/lint-config/eslint-ts";

export default [
  {
    ignores: ["dist/*"],
  },
  ...ESLintTSConfig,
];
