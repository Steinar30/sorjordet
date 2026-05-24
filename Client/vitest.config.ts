import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";
import suidPlugin from "@suid/vite-plugin";

export default defineConfig({
  plugins: [suidPlugin(), solidPlugin()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    server: {
      deps: {
        inline: [/solid-js/, /@suid\/material/, /@suid\/system/],
      },
    },
  },
  resolve: {
    conditions: ["development", "browser"],
  },
});
