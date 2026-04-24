import type { Metadata } from "next";
import { Source_Serif_4, Inter } from "next/font/google";
import "./globals.css";
import { ReadingProgressProvider } from "@/context/reading-progress-context";
import { FavoritesProvider } from "@/context/favorites-context";
import { VotesProvider } from "@/context/votes-context";
import { AuthProvider } from "@/components/auth-provider";
import { SignInPromptProvider } from "@/components/sign-in-prompt-provider";
import { UserMenu } from "@/components/user-menu";
import { VotingBanner } from "@/components/voting-banner";
import { auth, isAuthConfigured } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { loadInitialVotes, type InitialVotesState } from "@/lib/server/initial-votes";
import Link from "next/link";
import Script from "next/script";
import { SITE_URL } from "@/lib/constants";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ACX Review Archive",
    template: "%s | ACX Review Archive",
  },
  description: "A browsable archive of all book and non-book reviews from the annual Astral Codex Ten review contest.",
  keywords: ["ACX", "Astral Codex Ten", "book reviews", "Scott Alexander", "reading"],
  openGraph: {
    siteName: "ACX Review Archive",
    locale: "en_US",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Auth + DB calls are wrapped so the article-reading experience never
  // breaks if those services are misconfigured or briefly unreachable.
  let session = null;
  let initialVotes: InitialVotesState = {
    contestYear: null,
    contestTitle: null,
    votingStart: null,
    votingEnd: null,
    votedReviewIds: [],
  };
  try {
    session = await auth();
  } catch (err) {
    console.error('[layout] auth() failed; rendering as signed-out:', err);
  }
  try {
    initialVotes = await loadInitialVotes();
  } catch (err) {
    console.error('[layout] loadInitialVotes() failed; voting hidden:', err);
  }
  const isAdmin = isAdminEmail(session?.user?.email);
  return (
    <html lang="en" className={`${sourceSerif.variable} ${inter.variable}`}>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-MW01Z50CB3"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-MW01Z50CB3');
          `}
        </Script>
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
        <SignInPromptProvider>
        <ReadingProgressProvider>
        <FavoritesProvider>
        <VotesProvider initial={initialVotes}>
          <div className="min-h-screen flex flex-col">
            <VotingBanner />
            {/* Header */}
            <header className="border-b border-border bg-card">
              <div className="max-w-4xl mx-auto px-6 sm:px-8">
                <div className="flex h-16 items-center justify-between">
                  <Link
                    href="/"
                    className="text-foreground no-underline hover:no-underline"
                  >
                    <span className="text-xl font-serif font-semibold tracking-tight">
                      ACX Review Archive
                    </span>
                  </Link>

                  <nav className="flex items-center gap-6">
                    <a
                      href="https://www.astralcodexten.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors no-underline"
                    >
                      Astral Codex Ten
                    </a>
                    <UserMenu isAdmin={isAdmin} authAvailable={isAuthConfigured} />
                  </nav>
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1">
              {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-border py-10 mt-20 bg-muted/30">
              <div className="max-w-4xl mx-auto px-6 sm:px-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    Reviews from the{" "}
                    <a
                      href="https://www.astralcodexten.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link no-underline hover:underline"
                    >
                      Astral Codex Ten
                    </a>{" "}
                    book review contests
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2021 &ndash; 2025
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </VotesProvider>
        </FavoritesProvider>
        </ReadingProgressProvider>
        </SignInPromptProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
