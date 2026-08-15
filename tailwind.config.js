/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs", "./public/js/**/*.js", "./client/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "#050507",
        surface: "#0c0c12",
        primary: "#f5f3ff",
        secondary: "#a1a1aa",
        purple: {
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          650: "#7c3aed",
          700: "#7e22ce"
        }
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif"
        ]
      },
      boxShadow: {
        "glow-sm": "0 0 20px rgba(124, 58, 237, 0.25)",
        glow: "0 0 40px rgba(124, 58, 237, 0.35)",
        "glow-lg": "0 0 80px rgba(124, 58, 237, 0.45)",
        panel:
          "0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 60px rgba(124, 58, 237, 0.15)"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" }
        },
        shine: {
          "0%": { transform: "translateX(-150%) skewX(-20deg)" },
          "100%": { transform: "translateX(250%) skewX(-20deg)" }
        },
        "pulse-halo": {
          "0%, 100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.08)" }
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        shine: "shine 6s ease-in-out infinite",
        "pulse-halo": "pulse-halo 8s ease-in-out infinite",
        "fade-up": "fade-up 0.7s ease-out both"
      }
    }
  },
  plugins: []
};
