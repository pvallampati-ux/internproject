import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: "#0a0a0a",
          900: "#141414",
          800: "#1e1e1e",
          700: "#2a2a2a",
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
