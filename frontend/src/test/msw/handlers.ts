import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/content', () => {
    return HttpResponse.json({
      site_name: 'SchoolMart',
      home_hero: '{"title":"Welcome"}',
    });
  }),
  http.get('/api/pages/:slug', ({ params }) => {
    return HttpResponse.json({
      id: 1,
      slug: params.slug,
      title: `Page ${params.slug}`,
      pageData: JSON.stringify({ hero: { title: `Hero ${params.slug}` } }),
      published: true,
      contentModel: 'document',
      version: 1,
    });
  }),
  http.get('/api/wishlist', () => {
    return HttpResponse.json([]);
  }),
];
