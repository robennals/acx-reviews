import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'reading': ['1.125rem', { lineHeight: '1.85' }],
        'reading-lg': ['1.25rem', { lineHeight: '1.8' }],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.1), 0 2px 10px -2px rgba(0, 0, 0, 0.04)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
        'glow': '0 0 20px -5px hsl(var(--primary) / 0.3)',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "68ch",
            fontSize: "1.125rem",
            lineHeight: "1.85",
            color: "hsl(var(--foreground))",
            p: {
              marginTop: "1.5em",
              marginBottom: "1.5em",
            },
            a: {
              color: "hsl(var(--primary))",
              textDecoration: "none",
              borderBottom: "1px solid hsl(var(--primary) / 0.3)",
              transition: "border-color 0.2s ease",
              "&:hover": {
                borderColor: "hsl(var(--primary))",
              },
            },
            strong: {
              color: "hsl(var(--foreground))",
              fontWeight: "600",
            },
            h1: {
              fontWeight: "700",
              letterSpacing: "-0.02em",
              color: "hsl(var(--foreground))",
            },
            h2: {
              fontWeight: "600",
              letterSpacing: "-0.01em",
              marginTop: "2.5em",
              marginBottom: "1em",
              color: "hsl(var(--foreground))",
            },
            h3: {
              fontWeight: "600",
              marginTop: "2em",
              marginBottom: "0.75em",
              color: "hsl(var(--foreground))",
            },
            blockquote: {
              fontStyle: "italic",
              borderLeftColor: "hsl(var(--primary) / 0.5)",
              borderLeftWidth: "3px",
              paddingLeft: "1.5em",
              color: "hsl(var(--muted-foreground))",
            },
            code: {
              backgroundColor: "hsl(var(--muted))",
              padding: "0.25em 0.4em",
              borderRadius: "0.25em",
              fontSize: "0.875em",
              fontWeight: "400",
              color: "hsl(var(--foreground))",
            },
            "code::before": {
              content: '""',
            },
            "code::after": {
              content: '""',
            },
            pre: {
              backgroundColor: "hsl(var(--muted))",
              borderRadius: "var(--radius)",
              padding: "1.25em",
              overflow: "auto",
            },
            hr: {
              borderColor: "hsl(var(--border))",
              marginTop: "3em",
              marginBottom: "3em",
            },
            ul: {
              paddingLeft: "1.25em",
            },
            ol: {
              paddingLeft: "1.25em",
            },
            li: {
              marginTop: "0.5em",
              marginBottom: "0.5em",
            },
            img: {
              borderRadius: "var(--radius)",
              boxShadow: "0 4px 20px -5px rgba(0, 0, 0, 0.1)",
            },
          },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
export default config;
