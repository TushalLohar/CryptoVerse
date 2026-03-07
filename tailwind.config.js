/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

  theme: {
    extend: {
      colors: {
        bg: {
          base: "var(--bg-base)",
          elevated: "var(--bg-elevated)",
          hover: "var(--bg-hover)",
        },
        text: {
          1: "var(--text1)",
          2: "var(--text2)",
          3: "var(--text3)",
          4: "var(--text4)",
        },
        border: {
          DEFAULT: "var(--border)",
          md: "var(--border-md)",
        },
        crypto: {
          blue: "var(--blue)",
          green: "var(--green)",
          red: "var(--red)",
          gold: "var(--gold)",
        },
      },

      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },

      boxShadow: {
        glow: "0 0 20px rgba(61,142,248,0.15)",
        premium: "var(--shadow-lg)",
      },

      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        flashUp: {
          "0%": { backgroundColor: "rgba(34,197,94,0.15)" },
          "100%": { backgroundColor: "transparent" },
        },
        flashDown: {
          "0%": { backgroundColor: "rgba(244,63,94,0.15)" },
          "100%": { backgroundColor: "transparent" },
        },
      },

      animation: {
        shimmer: "shimmer 1.5s infinite linear",
        "fade-up": "fadeUp 0.25s ease forwards",
        "scale-in": "scaleIn 0.2s ease forwards",
        "flash-up": "flashUp 0.6s ease",
        "flash-down": "flashDown 0.6s ease",
        "spin-slow": "spin 2s linear infinite",
      },
    },
  },

  plugins: [],
}