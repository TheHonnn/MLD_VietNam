import { defineConfig } from "vite";
import zaloMiniApp from "zmp-vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default () => {
  return defineConfig({
    root: "./src",
    envDir: path.resolve(__dirname),
    base: "",
    plugins: [zaloMiniApp(), react()],
    server: {
      host: "0.0.0.0",
      port: 3000,
    },
    build: {
      outDir: path.resolve(__dirname, 'www'),
      emptyOutDir: true,
      target: ['es2020','chrome108','safari15.4','edge108','firefox109'],
      assetsInlineLimit: 0,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  });
};
