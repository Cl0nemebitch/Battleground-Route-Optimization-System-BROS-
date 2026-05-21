/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy battlefield tokens (keep for compatibility)
        battlefield: {
          bg:     "#060d1c",
          panel:  "#0c1726",
          border: "#1e3050",
          accent: "#5ee4a8",
          danger: "#dc2626",
          warn:   "#f97316",
          text:   "#e2e8f0",
          muted:  "#64748b",
        },
        // Stitch design tokens
        base:       "#060d1c",
        panel:      "#0c1726",
        border:     "#1e3050",
        water:      "#3b82f6",
        rough:      "#a07850",
        urban:      "#64748b",
        open:       "#22c55e",
        route:      "#5ee4a8",
        threathigh: "#dc2626",
        threatmed:  "#f97316",
        civilian:   "#9b7ed8",
        accent:     "#5ee4a8",
        primary:    "#5ee4a8",
      },
      fontFamily: {
        headline: ["Sora", "sans-serif"],
        display:  ["Sora", "sans-serif"],
        body:     ["IBM Plex Sans", "sans-serif"],
        label:    ["IBM Plex Sans", "sans-serif"],
        mono:     ["JetBrains Mono", "monospace"],
      },
      animation: {
        "ripple":     "ripple 3s linear infinite",
        "breathe":    "breathe 3s ease-in-out infinite",
        "flow":       "flowDash 2s linear infinite",
        "pulse-glow": "pulseGlow 2s infinite",
        "road-flow":  "roadFlow 1.2s linear infinite",
        "spin-slow":  "spin 2s linear infinite",
        "mtn-breath": "mountainBreath 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
