import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1A3C6B",
        "navy-dark": "#13294a",
        "navy-light": "#2c5290",
        orange: "#F97316",
        "orange-dark": "#e26410",
        cream: "#FFF8F1",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
