import { defineConfig } from "vite";
import zaloMiniApp from "zmp-vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";
import localizeJsx from './scripts/localize-jsx.mjs';

// https://vitejs.dev/config/
export default () => {
  return defineConfig({
    root: "./src",
    envDir: path.resolve(__dirname),
    base: "",
    plugins: [zaloMiniApp(), react({babel:{plugins:[localizeJsx]}})],
    server: {
      host: process.env.ZMP_DEV_HOST || "127.0.0.1",
      cors: false,
      fs: {strict:true,allow:[path.resolve(__dirname)],deny:[".env",".env.*","**/.git/**","*.{crt,pem}"]},
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
