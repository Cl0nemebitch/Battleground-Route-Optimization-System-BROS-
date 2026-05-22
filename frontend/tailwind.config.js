/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy battlefield tokens (keep for compatibility)
        battlefield: {
          bg:     "#0a0c10",
          panel:  "#111520",
          border: "#252d3d",
          accent: "#f59e0b",
          danger: "#e11d48",
          warn:   "#f57c00",
          text:   "#f0e0d1",
          muted:  "#a08e7a",
        },
        // Stitch design tokens
        base:       "#0a0c10",
        panel:      "#111520",
        border:     "#252d3d",
        water:      "#3b82f6",
        rough:      "#a07850",
        urban:      "#64748b",
        open:       "#22c55e",
        route:      "#f59e0b",
        threathigh: "#e11d48",
        threatmed:  "#f59e0b",
        civilian:   "#7c3aed",
        accent:     "#f59e0b",
        primary:    "#f59e0b",
      },
      fontFamily: {
        headline: ["Space Grotesk", "sans-serif"],
        display:  ["Space Grotesk", "sans-serif"],
        body:     ["JetBrains Mono", "monospace"],
        label:    ["JetBrains Mono", "monospace"],
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
