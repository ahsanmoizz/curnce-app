import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
  keyframes: {
    slideDown: {
      "0%": { transform: "translateY(-100%)" },
      "100%": { transform: "translateY(100%)" },
    },
  },
  animation: {
    slideDown: "slideDown 6s linear infinite",
    "bounce-slow": "bounce 3s infinite",
  },
},
  },
  plugins: [],
}

export default config
