// One rating cast by one voter for one review. The canonical shape both the
// CSV reader and the DB reader normalize to. `email` is PII — never surface it
// on the public-facing /results page.
export interface VoteRecord {
  email: string;
  slug: string;
  rating: number;
  ratedAt: string; // ISO 8601
}

// Minimal review identity for the report (title for display, slug for joins).
export interface ReviewRef {
  slug: string;
  title: string;
}
