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
          50: "#f5f7ff",
          100: "#ebf0fe",
          200: "#ced9fd",
          300: "#b1c2fb",
          400: "#7695f8",
          500: "#3b67f5", // Main Indigo
          600: "#355ddd",
          700: "#2c4db8",
          800: "#233e93",
          900: "#1d3278",
          DEFAULT: "#3b67f5",
        },
        accent: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b", // Amber
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          DEFAULT: "#f59e0b",
        },
        slate: {
          950: "#020617",
        },
        "navy-dark": "#0F172A", // Defined missing brand color
        "background-light": "#F8FAFC",
        "background-dark": "#020617",
        "surface-light": "#FFFFFF",
        "surface-dark": "#0F172A",
        "border-light": "#E2E8F0",
        "border-dark": "#1E293B",
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
        soft: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        premium:
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
