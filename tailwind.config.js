/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{html,ts}",
    "./node_modules/primeng/**/*.{html,js}", // Add PrimeNG content path to ensure styles are tree-shaken correctly if needed
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6", // Violet-500
          600: "#7c3aed", // Violet-600 — main brand
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          DEFAULT: "#7c3aed",
        },
        accent: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e", // Emerald-green
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          DEFAULT: "#22c55e",
        },
        "navy-dark": "#09090b",
        "background-light": "#fafafa",
        "background-dark": "#09090b",
        "surface-light": "#ffffff",
        "surface-dark": "#18181b",
        "border-light": "#e4e4e7",
        "border-dark": "#27272a",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "sans-serif"],
        body: ["Plus Jakarta Sans", "Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2.5rem",
      },
      boxShadow: {
        soft: "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)",
        premium: "0 10px 40px -10px rgba(124,58,237,0.25), 0 2px 8px -2px rgba(0,0,0,0.08)",
        glass: "0 8px 32px 0 rgba(124, 58, 237, 0.08)",
        glow: "0 0 20px rgba(124,58,237,0.35)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
