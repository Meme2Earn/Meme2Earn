/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#FFFFFF",
        surface: "#FFFFFF",
        raised: "#FFF5FA",
        line: "#E7D5DF",
        text: "#1E151A",
        muted: "#6F6269",
        mutedFaint: "#9B8F96",
        pink: "#FF3EA0",
        gold: "#B77900",
        lime: "#2F9E44",
        cyan: "#4FD1E8",
        orange: "#FF7A45",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Space Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};


