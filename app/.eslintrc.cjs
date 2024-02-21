module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended"
  ],
  ignorePatterns: ["dist", ".eslintrc.js", "vite.config.ts"],
  parser: "@typescript-eslint/parser",
  plugins: ["react", "react-hooks", "react-refresh", "jsx-a11y", "prettier"],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true
    }
  },
  rules: {
    "prettier/prettier": "error",
    "react/react-in-jsx-scope": "off",
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true }
    ],
    "sort-imports": [
      "error", {
        "ignoreCase": false,
        "ignoreDeclarationSort": false,
        "ignoreMemberSort": false,
        "memberSyntaxSortOrder": ["none", "all", "multiple", "single"],
        "allowSeparatedGroups": false
      }]
  },
  settings: {
    react: {
      version: "18.2"
    }
  }
};
