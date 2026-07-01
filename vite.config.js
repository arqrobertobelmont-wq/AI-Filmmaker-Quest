import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // permite importar .jsx sin extensión y tratar el archivo suelto como React
  esbuild: { loader: "jsx", include: /\.[jt]sx?$/ },
});
