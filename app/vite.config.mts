import { configDefaults } from "vitest/config";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteBasicSslPlugin from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: process.env.DEV_SSL === "true" ?
    [viteBasicSslPlugin(), react()] :
    [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.tsx",
    coverage: {
      ...configDefaults.coverage,
      provider: "v8",
      exclude: [
        ...configDefaults.coverage.exclude,
        "src/index.tsx",
        "src/test/*"]
    }
  }
});
