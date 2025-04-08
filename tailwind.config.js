/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'jdc-black': '#000000', // Main background
        'jdc-white': '#FFFFFF', // Main text
        'jdc-yellow': '#FFD700', // Primary accent (buttons, highlights)
        'jdc-dark-gray': '#1F1F1F', // Cards, inputs, secondary background
        'jdc-light-gray': '#CCCCCC', // Secondary text (adjust as needed)

        // Keep DaisyUI theme colors for compatibility if needed, but override base
        'base-100': '#000000', // JDC Black
        'base-200': '#1F1F1F', // JDC Dark Gray
        'base-300': '#15191e', // Keep darker gray for borders/dividers if needed
        'primary': '#FFD700', // JDC Yellow
        'secondary': '#828df8', // Keep or replace if needed
        'accent': '#f471b5', // Keep or replace if needed
        'base-content': '#FFFFFF', // JDC White
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'], // Prioritize Roboto
      },
      boxShadow: { // Remove 3D effect, use flat design
        'md': '0 4px 6px -1px rgba(255, 215, 0, 0.1), 0 2px 4px -1px rgba(255, 215, 0, 0.06)', // Subtle yellow shadow maybe? Or none.
        'lg': '0 10px 15px -3px rgba(255, 215, 0, 0.1), 0 4px 6px -2px rgba(255, 215, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(255, 215, 0, 0.1), 0 10px 10px -5px rgba(255, 215, 0, 0.04)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)', // Keep inner for active state if desired
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        jdc_theme: { // Define a custom theme based on JDC colors
          "primary": "#FFD700",          // Yellow
          "secondary": "#828df8",        // Keep or adjust
          "accent": "#f471b5",          // Keep or adjust
          "neutral": "#1F1F1F",         // Dark Gray for neutral elements
          "base-100": "#000000",        // Black background
          "base-200": "#1F1F1F",        // Dark Gray for cards/inputs
          "base-300": "#15191e",        // Darker Gray for borders
          "base-content": "#FFFFFF",     // White text
          "info": "#3abff8",            // Keep or adjust
          "success": "#36d399",         // Keep or adjust
          "warning": "#fbbd23",         // Keep or adjust
          "error": "#f87272",           // Keep or adjust

          // Ensure button styles match JDC
          "--btn-text-case": "none", // Normal case for buttons
          "--rounded-btn": "0.25rem", // Slightly rounded corners for buttons
        },
      },
      "halloween" // Keep halloween as a fallback or for reference if needed
    ],
    darkTheme: "jdc_theme", // Set the custom JDC theme as default
    base: true,
    styled: true,
    utils: true,
    rtl: false,
    prefix: "",
    logs: true,
  },
};
