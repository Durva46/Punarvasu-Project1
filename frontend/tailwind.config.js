import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, "index.html"),
    path.join(__dirname, "src/**/*.{js,ts,jsx,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        surface: "#f8fafc",
        line: "#e2e8f0",
        primary: {
          DEFAULT: "#2563eb",
          hover: "#1d4ed8",
        },
      },
    },
  },
  plugins: [],
}
