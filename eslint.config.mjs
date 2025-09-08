import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import mocha from "eslint-plugin-mocha";
import globals from "globals";
import tseslint from "typescript-eslint";
import node from "eslint-plugin-n";

export default tseslint.config(
  {
    ignores: ["coverage/**", "dist/**", "eslint.config.mjs"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  prettier,
  mocha.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 12,
      globals: {
        ...globals.node,
        ...globals.commonjs,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      sourceType: "commonjs",
    },

    plugins: {
      n: node,
    },

    rules: {
      indent: [
        "error",
        2,
        {
          SwitchCase: 1,
        },
      ],
      "linebreak-style": ["error", "unix"],
      "no-unused-vars": "off", // Handled by TypeScript
      quotes: [
        "error",
        "double",
        {
          avoidEscape: true,
        },
      ],
      semi: ["error", "always"],

      "n/exports-style": ["error"],
      "n/no-mixed-requires": ["warn"],
      "n/no-new-require": ["error"],
      "n/no-process-exit": ["warn"],
      "n/no-unsupported-features/es-syntax": ["off"],
      "n/prefer-global/buffer": ["warn"],

      "@typescript-eslint/array-type": [
        "error",
        {
          default: "array-simple",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          vars: "all",
          varsIgnorePattern: "^_",
        },
      ],
    },

    settings: {
      n: {
        tryExtensions: [".ts"],
      },
    },
  },
  {
    files: ["test/**/*.{ts,mts}"],

    plugins: {
      mocha: mocha,
    },

    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
);
