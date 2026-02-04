// Core data types for ACX Reviews app

export interface Review {
  id: string;                    // Unique slug-based identifier
  title: string;                 // Book/subject title
  author: string;                // Book author (or subject for non-book reviews)
  reviewAuthor: string;          // Contest participant name
  contestId: string;             // e.g., "2024-book-reviews"
  contestName: string;           // e.g., "2024 Book Reviews"
  year: number;                  // 2024, 2023, etc.
  publishedDate: string;         // ISO 8601 date
  slug: string;                  // URL-friendly identifier
  excerpt: string;               // First ~200 chars for preview
  wordCount: number;             // For reading time calculation
  readingTimeMinutes: number;    // Estimated reading time
  content?: string;              // Markdown content (loaded separately on detail page)
  originalUrl?: string;          // Link to original ACX post or Google Doc
  imageUrl?: string;             // Cover image path (optional)
  source: 'acx' | 'gdoc';        // Source of the review
}

export interface Contest {
  id: string;                    // "2024-book-reviews"
  name: string;                  // "2024 Book Reviews"
  year: number;                  // 2024
  type: 'book' | 'non-book';     // Contest type
  description: string;           // Contest description
  reviewCount: number;           // Number of reviews
  sourceType: 'acx' | 'gdoc' | 'both';  // Where reviews come from
}

export interface ReadingProgress {
  reviewId: string;
  lastReadDate: string;          // ISO 8601 timestamp
  scrollPosition: number;        // Pixels from top
  percentComplete: number;       // 0-100
  isComplete: boolean;           // Finished reading
}

// Source configuration for content extraction
export interface ACXSource {
  url: string;
  contestId: string;
  year: number;
  title?: string;                // Optional manual title if needed
  reviewAuthor?: string;         // Optional manual author if needed
}

export interface GDocsSource {
  docId: string;
  contestId: string;
  year: number;
  name: string;                  // E.g., "A-D" or "Games"
  type: 'individual' | 'composite';  // Single review or multiple reviews
}
