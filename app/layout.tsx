import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReadingProgressProvider } from "@/context/reading-progress-context";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en">
      <body className={inter.className}>
        <ReadingProgressProvider>
          <div className="min-h-screen flex flex-col">
            <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40">
              <div className="container mx-auto px-4 h-16 flex items-center">
                <Link href="/" className="text-xl font-bold hover:text-primary transition-colors">
                  ACX Reviews
                </Link>
                <nav className="ml-auto flex items-center gap-6 text-sm">
                  <Link href="/" className="hover:text-primary transition-colors">
                    Browse
                  </Link>
                  <a
                    href="https://www.astralcodexten.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    ACX Blog
                  </a>
                </nav>
              </div>
            </header>

            <main className="flex-1">
              {children}
            </main>

            <footer className="border-t mt-auto">
              <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
                <p>
                  Reviews from the{" "}
                  <a
                    href="https://www.astralcodexten.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Astral Codex Ten
                  </a>{" "}
                  book review contests (2021-2025)
                </p>
              </div>
            </footer>
          </div>
        </ReadingProgressProvider>
      </body>
    </html>
  );
}
