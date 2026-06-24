export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#F8F5EF",
          surface: "#FFFFFF",
          soft: "#F1E8DA",
          primary: "#4A3427",
          primaryLight: "#6B4A38",
          primaryDark: "#2C1D16",
          gold: "#C8A46A",
          goldSoft: "#E8D8B8",
          text: "#1F1A17",
          muted: "#7A6E66",
          border: "#E5D8C8",
          success: "#3F7D58",
          warning: "#C98A2E",
          danger: "#B94A48",
          info: "#6D7F8D",
        },
      },
      borderRadius: { xl2: "1.25rem" },
      boxShadow: {
        soft: "0 12px 30px rgba(74, 52, 39, 0.08)",
        card: "0 8px 22px rgba(31, 26, 23, 0.06)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Playfair Display", "serif"],
      },
    },
  },
  plugins: [],
};
