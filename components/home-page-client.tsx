'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Review, Contest } from '@/lib/types';
import { useSession } from 'next-auth/react';
import { useReadingProgressContext } from '@/context/reading-progress-context';
import { useFavoritesContext } from '@/context/favorites-context';
import { useVotesContext } from '@/context/votes-context';
import { markAsRead, markAsUnread } from '@/lib/reading-progress';
import { VoteButton } from '@/components/vote-button';

type StatusFilter = 'all' | 'unread' | 'read' | 'in-progress' | 'favorites' | 'voted';

const VALID_STATUS: StatusFilter[] = ['all', 'unread', 'read', 'in-progress', 'favorites', 'voted'];

interface FilterState {
  contestId: string | null;
  tag: string | null;
  query: string;
  status: StatusFilter;
  page: number;
}

function parseUrlFilters(search: string): FilterState {
  const params = new URLSearchParams(search);
  const rawStatus = params.get('status');
  const status = (VALID_STATUS as string[]).includes(rawStatus ?? '') ? (rawStatus as StatusFilter) : 'all';
  const rawPage = Number(params.get('page'));
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  return {
    contestId: params.get('contest'),
    tag: params.get('tag'),
    query: params.get('q') ?? '',
    status,
    page,
  };
}

function buildFilterUrl(next: FilterState): string {
  const params = new URLSearchParams();
  if (next.contestId) params.set('contest', next.contestId);
  if (next.tag) params.set('tag', next.tag);
  if (next.query) params.set('q', next.query);
  if (next.status !== 'all') params.set('status', next.status);
  if (next.page > 1) params.set('page', String(next.page));
  const qs = params.toString();
  return qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
}

interface HomePageClientProps {
  reviews: Review[];
  contests: Contest[];
  tags: string[];
}

const REVIEWS_PER_PAGE = 20;

export function HomePageClient({ reviews, contests, tags }: HomePageClientProps) {
  const [selectedContestId, setSelectedContestId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { progressMap, refreshProgress } = useReadingProgressContext();
  const { favoritesSet, toggleFavorite } = useFavoritesContext();
  const { votedReviewIds, contestYear } = useVotesContext();
  const { status: sessionStatus } = useSession();
  const showVotedFilter = sessionStatus === 'authenticated' && contestYear !== null;

  useEffect(() => {
    const applyFromUrl = () => {
      const f = parseUrlFilters(window.location.search);
      setSelectedContestId(f.contestId);
      setSelectedTag(f.tag);
      setSearchQuery(f.query);
      setStatusFilter(f.status);
      setCurrentPage(f.page);
    };
    applyFromUrl();
    window.addEventListener('popstate', applyFromUrl);
    return () => window.removeEventListener('popstate', applyFromUrl);
  }, []);

  const applyChanges = useCallback((changes: Partial<FilterState>) => {
    const next: FilterState = {
      contestId: 'contestId' in changes ? changes.contestId! : selectedContestId,
      tag: 'tag' in changes ? changes.tag! : selectedTag,
      query: changes.query ?? searchQuery,
      status: changes.status ?? statusFilter,
      page: changes.page ?? currentPage,
    };
    setSelectedContestId(next.contestId);
    setSelectedTag(next.tag);
    setSearchQuery(next.query);
    setStatusFilter(next.status);
    setCurrentPage(next.page);
    window.history.replaceState(null, '', buildFilterUrl(next));
  }, [selectedContestId, selectedTag, searchQuery, statusFilter, currentPage]);

  const handleToggleRead = useCallback((reviewId: string) => {
    const progress = progressMap[reviewId];
    if (progress?.isComplete) {
      markAsUnread(reviewId);
    } else {
      markAsRead(reviewId);
    }
    refreshProgress();
  }, [progressMap, refreshProgress]);

  const handleToggleFavorite = useCallback((reviewId: string) => {
    toggleFavorite(reviewId);
  }, [toggleFavorite]);

  const filteredReviews = useMemo(() => {
    let result = reviews;

    if (selectedContestId) {
      result = result.filter(r => r.contestId === selectedContestId);
    }

    if (selectedTag) {
      result = result.filter(r => r.tags?.includes(selectedTag));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(r => r.title.toLowerCase().includes(query));
    }

    if (statusFilter === 'read') {
      result = result.filter(r => progressMap[r.id]?.isComplete);
    } else if (statusFilter === 'unread') {
      result = result.filter(r => !progressMap[r.id]?.isComplete && !progressMap[r.id]?.percentComplete);
    } else if (statusFilter === 'in-progress') {
      result = result.filter(r => !progressMap[r.id]?.isComplete && (progressMap[r.id]?.percentComplete ?? 0) > 0);
    } else if (statusFilter === 'favorites') {
      result = result.filter(r => favoritesSet.has(r.id));
    } else if (statusFilter === 'voted') {
      result = result.filter(r => votedReviewIds.has(r.id));
    }

    return result;
  }, [reviews, selectedContestId, selectedTag, searchQuery, statusFilter, progressMap, favoritesSet, votedReviewIds]);

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE));
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE
  );

  const continueReading = useMemo(() =>
    reviews
      .filter(r => progressMap[r.id]?.lastReadDate && !progressMap[r.id]?.isComplete && (progressMap[r.id]?.percentComplete ?? 0) > 0)
      .sort((a, b) => {
        const dateA = new Date(progressMap[a.id].lastReadDate).getTime();
        const dateB = new Date(progressMap[b.id].lastReadDate).getTime();
        return dateB - dateA;
      })
      .slice(0, 2),
    [reviews, progressMap]
  );

  const sectionTitle = [
    statusFilter === 'read' ? 'Finished' :
    statusFilter === 'unread' ? 'Unread' :
    statusFilter === 'in-progress' ? 'In-Progress' :
    statusFilter === 'favorites' ? 'Saved' :
    statusFilter === 'voted' ? 'Voted' :
    '',
    selectedTag || '',
    selectedContestId
      ? `${contests.find(c => c.id === selectedContestId)?.year}`
      : '',
    'Reviews',
    searchQuery ? `matching "${searchQuery}"` : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-8 py-12">
      {/* Hero header */}
      <header className="mb-12 pb-10 border-b border-border">
        <h1 className="text-4xl sm:text-5xl font-serif font-semibold tracking-tight mb-4 text-balance">
          ACX Review Archive
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
          A browsable archive of all book and non-book reviews from the annual Astral Codex Ten review contest.
          This archive is maintained by{' '}
          <a href="https://robennals.org" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
            Rob Ennals
          </a>{' '}
          and is not officially endorsed by either Astral Codex Ten or the authors of the reviews.
        </p>
      </header>

      {/* Search and filter */}
      <div className="mb-10 space-y-4">
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => applyChanges({ query: e.target.value, page: 1 })}
            className="w-full px-4 py-3 bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--link))]/20 focus:border-[hsl(var(--link))]/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => applyChanges({ query: '', page: 1 })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap gap-3">
          <FilterDropdown
            label="Year"
            value={selectedContestId ? String(contests.find(c => c.id === selectedContestId)?.year) : 'All'}
            options={[
              { id: null, label: 'All' },
              ...contests.map(c => ({ id: c.id, label: String(c.year) })),
            ]}
            onSelect={(id) => applyChanges({ contestId: id, page: 1 })}
            isFiltered={selectedContestId !== null}
          />
          {tags.length > 0 && (
            <FilterDropdown
              label="Topic"
              value={selectedTag || 'All'}
              options={[
                { id: null, label: 'All' },
                ...tags.map(t => ({ id: t, label: t })),
              ]}
              onSelect={(id) => applyChanges({ tag: id, page: 1 })}
              isFiltered={selectedTag !== null}
            />
          )}
          <FilterDropdown
            label="Status"
            value={
              statusFilter === 'all' ? 'All' :
              statusFilter === 'unread' ? 'Unread' :
              statusFilter === 'in-progress' ? 'In Progress' :
              statusFilter === 'read' ? 'Finished' :
              statusFilter === 'voted' ? 'Voted' :
              'Saved'
            }
            options={[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'in-progress', label: 'In Progress' },
              { id: 'read', label: 'Finished' },
              { id: 'favorites', label: 'Saved' },
              ...(showVotedFilter ? [{ id: 'voted', label: 'Voted' }] : []),
            ]}
            onSelect={(id) => applyChanges({ status: (id || 'all') as StatusFilter, page: 1 })}
            isFiltered={statusFilter !== 'all'}
          />
        </div>
      </div>

      {/* Continue reading - hide when searching or filtering by status */}
      {continueReading.length > 0 && !searchQuery && statusFilter === 'all' && (
        <section className="mb-12">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
            Continue Reading
          </h2>
          <div className="space-y-2">
            {continueReading.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                progress={progressMap[review.id]}
                isFavorite={favoritesSet.has(review.id)}
                onToggleRead={handleToggleRead}
                onToggleFavorite={handleToggleFavorite}
                compact
              />
            ))}
          </div>
        </section>
      )}

      {/* All reviews */}
      <section>
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {sectionTitle}
          </h2>
          <span className="text-sm text-muted-foreground">
            {filteredReviews.length} {filteredReviews.length === 1 ? 'review' : 'reviews'}
          </span>
        </div>
        {filteredReviews.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            No reviews found{searchQuery ? ` for "${searchQuery}"` : ''}.
          </p>
        ) : (
          <div className="space-y-1">
            {paginatedReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                progress={progressMap[review.id]}
                isFavorite={favoritesSet.has(review.id)}
                onToggleRead={handleToggleRead}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-border">
            <button
              onClick={() => applyChanges({ page: currentPage - 1 })}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => applyChanges({ page: currentPage + 1 })}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  onSelect,
  isFiltered,
}: {
  label: string;
  value: string;
  options: { id: string | null; label: string }[];
  onSelect: (id: string | null) => void;
  isFiltered: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`
          flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors
          ${isFiltered
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          }
        `}
      >
        <span>{label}: {value}</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
          {options.map((opt) => (
            <button
              key={opt.id ?? '__all__'}
              onClick={() => { onSelect(opt.id); setOpen(false); }}
              className={`
                w-full text-left px-4 py-2 text-sm transition-colors hover:bg-muted
                ${opt.label === value ? 'text-foreground font-medium' : 'text-muted-foreground'}
              `}
            >
              {opt.label === value && (
                <svg className="inline w-3.5 h-3.5 mr-2 -ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ReviewCardProps {
  review: Review;
  progress?: { percentComplete: number; isComplete: boolean } | null;
  isFavorite: boolean;
  onToggleRead: (reviewId: string) => void;
  onToggleFavorite: (reviewId: string) => void;
  compact?: boolean;
}

function ReviewCard({ review, progress, isFavorite, onToggleRead, onToggleFavorite, compact }: ReviewCardProps) {
  const isComplete = progress?.isComplete;
  const percentComplete = progress?.percentComplete || 0;
  const isInProgress = !isComplete && percentComplete > 0;

  return (
    <Link
      href={`/reviews/${review.slug}`}
      className="block group no-underline"
    >
      <article className={`
        relative py-5 px-5 -mx-5 rounded-lg
        hover:bg-muted/50 transition-colors
        ${isComplete ? 'opacity-70' : ''}
      `}>
        {/* Progress indicator bar */}
        {isInProgress && (
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-[hsl(var(--link))]"
               style={{ height: `${percentComplete}%` }} />
        )}

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className={`
            font-serif text-xl font-medium leading-snug mb-1
            text-foreground group-hover:text-[hsl(var(--link))] transition-colors
            ${compact ? 'line-clamp-1' : ''}
          `}>
            {review.title}
          </h3>

          {/* Book author & reviewer - only show if meaningful */}
          {(review.author !== 'Unknown' || review.reviewAuthor !== 'Anonymous') && (
            <p className="text-sm text-muted-foreground mb-2">
              {review.author !== 'Unknown' && (
                <span className="text-foreground/80">{review.author}</span>
              )}
              {review.author !== 'Unknown' && review.reviewAuthor !== 'Anonymous' && (
                <>{' '}&middot;{' '}</>
              )}
              {review.reviewAuthor !== 'Anonymous' && (
                <>reviewed by {review.reviewAuthor}</>
              )}
            </p>
          )}

          {/* Excerpt */}
          {!compact && (
            <p className="text-muted-foreground leading-relaxed line-clamp-2 mb-3">
              {review.excerpt}
            </p>
          )}

          {/* Meta + inline actions */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{review.year}</span>
            <span>&middot;</span>
            <span>{review.readingTimeMinutes} min</span>
            {review.tags && review.tags.length > 0 && (
              <>
                <span>&middot;</span>
                {review.tags.map(tag => (
                  <span key={tag} className="inline-flex px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </>
            )}
            {isComplete && (
              <>
                <span>&middot;</span>
                <span className="text-[hsl(var(--link))]">Finished</span>
              </>
            )}
            {isInProgress && (
              <>
                <span>&middot;</span>
                <span>{Math.round(percentComplete)}%</span>
              </>
            )}
            <span>&middot;</span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleRead(review.id); }}
              className={`hover:text-foreground transition-colors ${
                isComplete ? 'text-[hsl(var(--link))]' : ''
              }`}
            >
              {isComplete ? 'Mark unfinished' : 'Mark finished'}
            </button>
            <span>&middot;</span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(review.id); }}
              className={`hover:text-foreground transition-colors ${
                isFavorite ? 'text-amber-500' : ''
              }`}
            >
              {isFavorite ? 'Saved' : 'Save'}
            </button>
            <VoteSeparator>
              <VoteButton
                reviewSlug={review.slug}
                reviewId={review.id}
                reviewYear={review.year}
              />
            </VoteSeparator>
          </div>
        </div>
      </article>
    </Link>
  );
}

// Renders a "·" separator only when its children render something. The
// VoteButton self-hides when voting is closed or the year doesn't match, so
// we suppress the leading dot in those cases.
function VoteSeparator({ children }: { children: React.ReactNode }) {
  const node = children as React.ReactElement<{ reviewYear: number }>;
  const { contestYear } = useVotesContext();
  if (contestYear === null || contestYear !== node.props.reviewYear) return null;
  return (
    <>
      <span>&middot;</span>
      {children}
    </>
  );
}
