import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0a0f1f",
          900: "#0d1526",
          800: "#121b30",
          700: "#1a2540",
        },
        gold: {
          400: "#d4af6a",
          500: "#c39a4f",
        },
      },
    },
  },
  plugins: [],
};

export default config;
