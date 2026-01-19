import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import ui from "@nuxt/ui/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(),  ui({
       // 📌 configuración de tema / color mode 🔥
       colorMode: false
     }),],
});
