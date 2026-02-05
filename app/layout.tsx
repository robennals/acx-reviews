import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { ReadingProgressProvider } from "@/context/reading-progress-context";
import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "ACX Reviews - Astral Codex Ten Book & Non-Book Reviews",
  description: "Browse and read 200+ reviews from the ACX book review contests (2021-2025). Track your reading progress across all contests.",
  keywords: ["ACX", "Astral Codex Ten", "book reviews", "Scott Alexander", "reading"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className={`${inter.className} antialiased`}>
        <ReadingProgressProvider>
          <div className="min-h-screen flex flex-col bg-pattern">
            {/* Header */}
            <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                  <Link
                    href="/"
                    className="flex items-center gap-3 group"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold tracking-tight">
                        ACX Reviews
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:block">
                        Astral Codex Ten
                      </span>
                    </div>
                  </Link>

                  <nav className="flex items-center gap-1">
                    <Link
                      href="/"
                      className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                    >
                      Browse
                    </Link>
                    <a
                      href="https://www.astralcodexten.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                    >
                      ACX Blog
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </nav>
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1">
              {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-border/50 bg-muted/30">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-12 md:py-16">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">ACX Reviews</p>
                        <p className="text-sm text-muted-foreground">
                          Book review contests 2021-2025
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-2">
                      <p className="text-sm text-muted-foreground">
                        Reviews from the{" "}
                        <a
                          href="https://www.astralcodexten.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline underline-offset-4"
                        >
                          Astral Codex Ten
                        </a>{" "}
                        book review contests
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        A reading companion for curious minds
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </ReadingProgressProvider>
      </body>
    </html>
  );
}
