/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        '3d': '0 5px 15px rgba(0, 0, 0, 0.3), inset 0 -4px 0 rgba(0, 0, 0, 0.2)',
        '3d-hover': '0 8px 20px rgba(0, 0, 0, 0.35), inset 0 -6px 0 rgba(0, 0, 0, 0.25)',
      },
      colors: {
        'base-100': '#1d232a', // DaisyUI halloween base-100
        'base-200': '#1a1f26', // Slightly darker
        'base-300': '#15191e', // Even darker
        'primary': '#3abff8', // DaisyUI halloween primary
        'secondary': '#828df8', // DaisyUI halloween secondary
        'accent': '#f471b5', // DaisyUI halloween accent
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["halloween"], // Keep the halloween theme for a dark, modern base
    darkTheme: "halloween", // Ensure dark theme is default
  },
};
