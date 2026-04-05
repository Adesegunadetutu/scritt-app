/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // --- BRAND COLORS ---
        // Deep Forest Green
        primary: {
          DEFAULT: "#005d14",
          dark: "#00450f",
          surface: "#f0fdf4", 
        },
        // Honey Orange
        secondary: {
          DEFAULT: "#EAA535",
          light: "#fef3c7",
          dark: "#c27803",
          soft: "#FFF9EF", 
        },

        // --- FUNCTIONAL UI MAPPING ---
        // Use these for high-level layouts
        app: {
          bg: "#f9fafb",        // main background (neutral-50)
          "bg-dark": "#111827", // dark mode background (neutral-900)
          text: "#111827",      // titles (neutral-900)
          "text-muted": "#9ca3af", // placeholders (neutral-400)
        },
        
        // Use these for specific components
        button: {
          primary: "#005d14",
          action: "#EAA535",
          disabled: "#f3f4f6",
        },
        
        card: {
          DEFAULT: "#FFFFFF",
          forest: "#f0fdf4",    // themed card using primary.surface
          honey: "#FFF9EF",     // themed card using secondary.soft
          border: "#f3f4f6",    // subtle separators
        },

        // Keeping your raw neutrals for flexibility
        neutral: {
          50: "#f9fafb",
          100: "#f3f4f6",
          400: "#9ca3af",
          900: "#111827",
        },

        accent: "#E8F6EF", 
      },
    },
  },
  plugins: [],
  darkMode: "class",
};