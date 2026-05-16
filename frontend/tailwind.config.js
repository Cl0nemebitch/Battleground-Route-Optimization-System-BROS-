/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        battlefield: {
          bg: "#0c1117",
          panel: "#141c27",
          border: "#243044",
          accent: "#3d9a6f",
          danger: "#c45c4a",
          warn: "#d4a24c",
          text: "#e8edf4",
          muted: "#8b9cb3",
        },
      },
      fontFamily: {
        display: ['"Segoe UI"', "system-ui", "sans-serif"],
        mono: ['"Cascadia Code"', "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
