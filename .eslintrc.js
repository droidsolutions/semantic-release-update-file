module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2020: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:node/recommended",
    "plugin:mocha/recommended",
    "plugin:prettier/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 12,
  },
  plugins: ["@typescript-eslint", "prettier", "mocha"],
  rules: {
    indent: ["error", 2, { SwitchCase: 1 }],
    "linebreak-style": ["error", "unix"],
    quotes: ["error", "double", { avoidEscape: true }],
    semi: ["error", "always"],
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "prettier/prettier": "error",
    "node/no-unsupported-features/es-syntax": ["error", { ignores: ["modules"] }],
    "node/no-missing-import": [
      "error",
      {
        allowModules: [],
        tryExtensions: [".js", ".json", ".node", ".ts"],
      },
    ],
  },
  settings: {
    node: {
      tryExtensions: [".ts"],
    },
  },
};
