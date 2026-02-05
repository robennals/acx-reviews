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
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            fontSize: "1.125rem",
            lineHeight: "1.8",
            color: "hsl(var(--foreground))",
            fontFamily: "var(--font-serif), Georgia, serif",

            // Paragraphs
            p: {
              marginTop: "1.5em",
              marginBottom: "1.5em",
            },

            // Links - LessWrong style green
            a: {
              color: "hsl(var(--link))",
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
              },
            },

            // Strong
            strong: {
              color: "hsl(var(--foreground))",
              fontWeight: "600",
            },

            // Headings
            h1: {
              fontFamily: "var(--font-serif), Georgia, serif",
              fontWeight: "600",
              fontSize: "2em",
              letterSpacing: "-0.02em",
              color: "hsl(var(--foreground))",
              marginTop: "1.5em",
              marginBottom: "0.75em",
            },
            h2: {
              fontFamily: "var(--font-serif), Georgia, serif",
              fontWeight: "600",
              fontSize: "1.5em",
              letterSpacing: "-0.01em",
              marginTop: "1.75em",
              marginBottom: "0.75em",
              color: "hsl(var(--foreground))",
            },
            h3: {
              fontFamily: "var(--font-serif), Georgia, serif",
              fontWeight: "600",
              fontSize: "1.25em",
              marginTop: "1.5em",
              marginBottom: "0.5em",
              color: "hsl(var(--foreground))",
            },
            h4: {
              fontFamily: "var(--font-serif), Georgia, serif",
              fontWeight: "600",
              marginTop: "1.25em",
              marginBottom: "0.5em",
              color: "hsl(var(--foreground))",
            },

            // Blockquotes
            blockquote: {
              fontStyle: "italic",
              borderLeftColor: "hsl(var(--border))",
              borderLeftWidth: "3px",
              paddingLeft: "1.25em",
              marginLeft: "0",
              color: "hsl(var(--muted-foreground))",
            },

            // Code
            code: {
              backgroundColor: "hsl(var(--muted))",
              padding: "0.2em 0.4em",
              borderRadius: "4px",
              fontSize: "0.875em",
              fontWeight: "400",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
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
              borderRadius: "6px",
              padding: "1em 1.25em",
              overflow: "auto",
              fontSize: "0.875em",
              lineHeight: "1.6",
            },
            "pre code": {
              backgroundColor: "transparent",
              padding: "0",
              borderRadius: "0",
            },

            // Horizontal rules
            hr: {
              borderColor: "hsl(var(--border))",
              marginTop: "2.5em",
              marginBottom: "2.5em",
            },

            // Lists
            ul: {
              paddingLeft: "1.5em",
            },
            ol: {
              paddingLeft: "1.5em",
            },
            li: {
              marginTop: "0.5em",
              marginBottom: "0.5em",
            },
            "li::marker": {
              color: "hsl(var(--muted-foreground))",
            },

            // Images
            img: {
              borderRadius: "6px",
              marginTop: "2em",
              marginBottom: "2em",
            },

            // Figures
            figcaption: {
              color: "hsl(var(--muted-foreground))",
              fontSize: "0.875em",
              marginTop: "0.75em",
              textAlign: "center",
            },

            // Tables
            table: {
              fontSize: "0.9375em",
            },
            thead: {
              borderBottomColor: "hsl(var(--border))",
            },
            "thead th": {
              fontWeight: "600",
              color: "hsl(var(--foreground))",
            },
            "tbody tr": {
              borderBottomColor: "hsl(var(--border))",
            },
          },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
export default config;
