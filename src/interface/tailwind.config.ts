import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tv: {
          dark: "#08090d",
          card: "#12141d",
          cardHover: "#1a1e2b",
          border: "#252b3d",
          accent: "#6366f1",
          accentHover: "#4f46e5",
          highlight: "#f43f5e",
          success: "#10b981",
          warning: "#f59e0b",
        },
      },
      boxShadow: {
        "tv-glow": "0 0 35px -5px rgba(99, 102, 241, 0.4)",
        "tv-glow-success": "0 0 35px -5px rgba(16, 185, 129, 0.4)",
        "tv-glow-danger": "0 0 35px -5px rgba(244, 63, 94, 0.4)",
        "tv-card": "0 10px 40px -10px rgba(0, 0, 0, 0.7)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "spin-slow": "spin 12s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
