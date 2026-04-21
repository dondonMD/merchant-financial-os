import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        brand: {
          50: "#eefbf7",
          100: "#d7f5ec",
          500: "#0f9f78",
          600: "#0b7d5e",
          700: "#0a5a46"
        },
        gold: "#D4A43B",
        mist: "#F4F7FB"
      },
      boxShadow: {
        panel: "0 16px 40px rgba(15, 23, 42, 0.08)"
      },
      backgroundImage: {
        hero: "radial-gradient(circle at top left, rgba(15,159,120,0.18), transparent 35%), linear-gradient(135deg, #f8fbff 0%, #eefbf7 50%, #ffffff 100%)"
      }
    }
  },
  plugins: []
};

export default config;

