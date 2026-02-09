import { MetadataRoute } from 'next';
import { getAllReviews } from '@/lib/reviews';
import { SITE_URL } from '@/lib/constants';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const reviews = await getAllReviews();

  const reviewEntries: MetadataRoute.Sitemap = reviews.map((review) => ({
    url: `${SITE_URL}/reviews/${review.slug}`,
    lastModified: review.publishedDate,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
    },
    ...reviewEntries,
  ];
}
