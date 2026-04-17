import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const capacitorBuild = process.env.CAPACITOR_BUILD === "true";
  return {
    base: capacitorBuild ? "./" : "/",
    plugins: [react(), tailwindcss()],
    define: {
      //'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      proxy: {
        "/api": { target: "http://localhost:3001", changeOrigin: true },
      },
    },
  };
});
