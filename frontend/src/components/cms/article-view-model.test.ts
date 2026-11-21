import { describe, it, expect } from 'vitest';
import { buildArticleViewModel } from './article-view-model';

describe('buildArticleViewModel', () => {
  const defaultOptions = {
    hubSlug: 'labs',
    hubTitle: 'Laboratory Solutions',
    defaultCtaHref: '/contact-us',
    defaultCtaLabel: 'Partner With Us',
  };

  it('1. Minimal card with default fallbacks', () => {
    const card = { title: 'Robotics Lab' };
    const result = buildArticleViewModel(card, {}, defaultOptions);

    expect(result.pageData.heroTitle).toBe('Robotics Lab');
    expect(result.pageData.category).toBe('Laboratory Solutions');
    expect(result.pageData.featuredImage).toBe('');
    expect(result.pageData.body).toBe('');
    expect(result.pageData.ctaTitle).toBe('Want to bring robotics lab to your campus?');
    expect(result.pageData.ctaSubtitle).toBe('Talk to our team about tailored advisory, planning, and implementation.');
    expect(result.pageData.ctaButtonLabel).toBe('Partner With Us');
    expect(result.pageData.ctaHref).toBe('/contact-us');
    expect(result.pageData.hideCta).toBe(false);
    expect(result.adminEditUrl).toBe('/admin/pages?edit=labs&card=robotics-lab');
    expect(result.adminEditLabel).toBe('Edit in Laboratory Solutions');
    expect(result.backLink).toEqual({
      label: 'Back to Laboratory Solutions',
      href: '/labs',
    });
  });

  it('2. Custom detail content via useCustomDetail', () => {
    const card = {
      title: 'AI Workstation',
      useCustomDetail: true,
      detailContent: '<p>Custom deep-dive content</p>',
      body: '<p>Standard body should be ignored</p>',
    };
    const result = buildArticleViewModel(card, {}, defaultOptions);

    expect(result.pageData.body).toBe('<p>Custom deep-dive content</p>');
  });

  it('3. Standard body / content fallback when useCustomDetail is false', () => {
    const card = {
      title: 'AR/VR Suite',
      useCustomDetail: false,
      detailContent: '<p>Custom deep-dive content</p>',
      body: '<p>Standard body content</p>',
    };
    const result = buildArticleViewModel(card, {}, defaultOptions);

    expect(result.pageData.body).toBe('<p>Standard body content</p>');
  });

  it('4. Methodology-only body content', () => {
    const card = {
      title: 'Design Thinking',
      methodology: '<p>Our 5-phase methodology</p>',
    };
    const result = buildArticleViewModel(card, {}, defaultOptions);

    expect(result.pageData.body).toBe('<p>Our 5-phase methodology</p>');
  });

  it('5. Methodology combined with distinct description creates lead paragraph', () => {
    const card = {
      title: 'Smart Classrooms',
      description: 'Transforming traditional lecture halls into interactive spaces.',
      methodology: '<p>Full deployment process breakdown.</p>',
    };
    const result = buildArticleViewModel(card, {}, defaultOptions);

    expect(result.pageData.body).toContain('<p class="lead text-base sm:text-lg text-slate-600 mb-6 font-medium">Transforming traditional lecture halls into interactive spaces.</p>');
    expect(result.pageData.body).toContain('<p>Full deployment process breakdown.</p>');
  });

  it('6. Description-only fallback when no body or methodology', () => {
    const card = {
      title: 'Language Lab',
      description: 'Equipped with speech analysis software.',
    };
    const result = buildArticleViewModel(card, {}, defaultOptions);

    expect(result.pageData.body).toBe('Equipped with speech analysis software.');
  });

  it('7. Adapts structured deliverables into HTML grid', () => {
    const card = {
      title: 'Composite Skill Lab',
      body: '<p>Main lab info</p>',
      deliverablesHeading: 'Project Phases',
      deliverables: [
        { phaseLabel: 'Phase 01', title: 'Site Inspection', desc: 'Acoustic and spatial survey' },
        { title: 'Hardware Delivery', desc: 'Sensors and test rigs arrive' },
      ],
    };
    const result = buildArticleViewModel(card, {}, defaultOptions);

    expect(result.pageData.body).toContain('Project Phases');
    expect(result.pageData.body).toContain('Phase 01');
    expect(result.pageData.body).toContain('Site Inspection');
    expect(result.pageData.body).toContain('Phase 02'); // auto fallback idx + 1
    expect(result.pageData.body).toContain('Hardware Delivery');
  });

  it('8. Category resolution hierarchy: category > eyebrow > categories[0] > hubTitle', () => {
    // 8a. card.category wins
    const c1 = { title: 'T', category: 'High Tech', eyebrow: 'Eyebrow', categories: ['ArrayCat'] };
    expect(buildArticleViewModel(c1, {}, defaultOptions).pageData.category).toBe('High Tech');

    // 8b. eyebrow wins if no category
    const c2 = { title: 'T', eyebrow: 'Special Eyebrow', categories: ['ArrayCat'] };
    expect(buildArticleViewModel(c2, {}, defaultOptions).pageData.category).toBe('Special Eyebrow');

    // 8c. categories[0] wins if no category or eyebrow
    const c3 = { title: 'T', categories: ['FirstCategory', 'Second'] };
    expect(buildArticleViewModel(c3, {}, defaultOptions).pageData.category).toBe('FirstCategory');

    // 8d. hubTitle fallback if none present
    const c4 = { title: 'T' };
    expect(buildArticleViewModel(c4, {}, defaultOptions).pageData.category).toBe('Laboratory Solutions');
  });

  it('9. Before and after images filter out empty/falsy values', () => {
    const card = {
      title: 'Renovation Project',
      beforeImages: ['/img/before1.jpg', '', null, '/img/before2.jpg'],
      afterImages: ['/img/after1.jpg', undefined, '/img/after2.jpg'],
    };
    const result = buildArticleViewModel(card, {}, defaultOptions);

    expect(result.pageData.beforeImages).toEqual(['/img/before1.jpg', '/img/before2.jpg']);
    expect(result.pageData.afterImages).toEqual(['/img/after1.jpg', '/img/after2.jpg']);
  });

  it('10. Card-level CTA overrides take precedence over hub CTA', () => {
    const card = {
      title: 'Campus Automation',
      ctaTitle: 'Get Automation Now',
      ctaSubtitle: '24-hour setup',
      ctaButtonLabel: 'Instant Quote',
      ctaButtonHref: '/quote/automation',
      hideCta: true,
    };
    const hub = {
      ctaTitle: 'Hub CTA Title',
      ctaSubtitle: 'Hub CTA Subtitle',
      ctaButtonLabel: 'Hub CTA Label',
      ctaHref: '/hub-cta',
    };
    const result = buildArticleViewModel(card, hub, defaultOptions);

    expect(result.pageData.ctaTitle).toBe('Get Automation Now');
    expect(result.pageData.ctaSubtitle).toBe('24-hour setup');
    expect(result.pageData.ctaButtonLabel).toBe('Instant Quote');
    expect(result.pageData.ctaHref).toBe('/quote/automation');
    expect(result.pageData.hideCta).toBe(true);
  });

  it('11. Modern hub.cta nested object fallback', () => {
    const card = { title: 'Physics Lab' };
    const hub = {
      heroImage: '/images/hub-hero.jpg',
      cta: {
        ctaTitle: 'Build Modern Labs',
        ctaSubtitle: 'Consult our architects',
        ctaButtonLabel: 'Book Consultation',
        ctaHref: '/book-lab',
      },
    };
    const result = buildArticleViewModel(card, hub, defaultOptions);

    expect(result.pageData.featuredImage).toBe('/images/hub-hero.jpg');
    expect(result.pageData.ctaTitle).toBe('Build Modern Labs');
    expect(result.pageData.ctaSubtitle).toBe('Consult our architects');
    expect(result.pageData.ctaButtonLabel).toBe('Book Consultation');
    expect(result.pageData.ctaHref).toBe('/book-lab');
  });

  it('12. Admin edit URL generation handles explicit slug and fallback slugify', () => {
    const cardWithSlug = { title: 'Chemistry Lab', slug: 'chem-lab-v2' };
    const result1 = buildArticleViewModel(cardWithSlug, {}, defaultOptions);
    expect(result1.adminEditUrl).toBe('/admin/pages?edit=labs&card=chem-lab-v2');

    const cardNoSlug = { title: 'Physics & Chemistry: Level 1!' };
    const result2 = buildArticleViewModel(cardNoSlug, {}, defaultOptions);
    expect(result2.adminEditUrl).toBe('/admin/pages?edit=labs&card=physics-chemistry-level-1');
  });
});
