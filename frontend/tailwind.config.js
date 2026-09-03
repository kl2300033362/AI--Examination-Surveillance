/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: "#0f172a",
        darker: "#020617",
        panel: "rgba(30, 41, 59, 0.7)",
        primary: "#3b82f6",
        warning: "#f59e0b",
        critical: "#ef4444",
        success: "#10b981",
      }
    },
  },
  plugins: [],
}
