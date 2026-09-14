/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        surface: "#1E1A14",
        raised: "#241F18",
        line: "#2E2A21",
        text: "#F5F1E6",
        muted: "#9C9284",
        mutedFaint: "#6B6356",
        pink: "#FF3EA0",
        gold: "#FFCF3F",
        lime: "#7ED957",
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
