/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff5e9",
          100: "#ffe8d6",
          200: "#ffd0ad",
          300: "#ffb283",
          400: "#ff9157",
          500: "#ff7b47",
          600: "#f45720",
          700: "#c94012",
          800: "#a23412",
          900: "#812e14"
        }
      }
    }
  },
  plugins: []
};
