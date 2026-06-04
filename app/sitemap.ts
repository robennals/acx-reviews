import { MetadataRoute } from 'next';
import { getAllReviews } from '@/lib/reviews';
import { getContestStatus } from '@/lib/server/contest-status';
import { hideUnlaunched } from '@/lib/launch-filter';
import { SITE_URL } from '@/lib/constants';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { config, live } = await getContestStatus();
  const reviews = hideUnlaunched(await getAllReviews(), config, live);

  const reviewEntries: MetadataRoute.Sitemap = reviews.map((review) => ({
    url: `${SITE_URL}/reviews/${review.slug}`,
    lastModified: review.publishedDate,
  }));

  return [
    { url: SITE_URL, lastModified: new Date() },
    { url: `${SITE_URL}/epub`, lastModified: new Date() },
    ...reviewEntries,
  ];
}
