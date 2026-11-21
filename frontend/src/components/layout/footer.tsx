import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Youtube, Instagram, Linkedin } from 'lucide-react';
import { useSiteContent } from '@/contexts/SiteContentContext';

export interface FooterLinkItem {
  label: string;
  href: string;
}

export interface FooterCategoryItem {
  title: string;
  items: FooterLinkItem[];
}

export interface FooterSettingsData {
  aboutText?: string;
  aboutLinks?: FooterLinkItem[];
  businessLinks?: FooterLinkItem[];
  categories?: FooterCategoryItem[];
  brands?: FooterLinkItem[];
  trending?: FooterLinkItem[];
  copyright?: string;
  policyLinks?: FooterLinkItem[];
}

export const DEFAULT_ABOUT_TEXT =
  'schoolmart.in is a consortium of architects, designers, and school innovators. We help schools in setting up new campuses, expanding existing institutions, design-to-execution, specialized learning environments, labs, libraries, and athletic infrastructure.';

export const DEFAULT_ABOUT_LINKS: FooterLinkItem[] = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Seller & Vendor Help', href: '/seller-help' },
  { label: 'Sell on SchoolMart', href: '/sell-on-schoolmart' },
  { label: 'Setup Guide', href: '/setup-guide' },
];

export const DEFAULT_BUSINESS_LINKS: FooterLinkItem[] = [
  { label: 'About Us', href: '/about-us' },
  { label: 'Corporate Solutions', href: '/corporate' },
  { label: 'Partnerships', href: '/partnerships' },
  { label: 'Contact Us', href: '/contact-us' },
  { label: 'Institutional Pricing', href: '/pricing' },
  { label: 'School Sale Exchange', href: '/school-sale' },
  { label: 'Delivery Locations', href: '/delivery-locations' },
  { label: 'Report Issue', href: '/report-issue' },
  { label: 'Blog', href: '/blog' },
];

export const DEFAULT_CATEGORIES: FooterCategoryItem[] = [
  {
    title: 'School Furniture',
    items: [
      { label: 'Primary & High School', href: '/furniture' },
      { label: 'Kindergarten Furniture', href: '/p/kindergarten-design' },
      { label: 'Ergonomic Classrooms', href: '/p/furniture-design-planning-' },
      { label: 'Institutional Desks', href: '/furniture' },
      { label: 'SchoolMart Store', href: 'https://schoolmart.store' },
    ],
  },
  {
    title: 'Labs & Libraries',
    items: [
      { label: 'Composite Skill Labs', href: '/labs' },
      { label: 'Science & Experiential', href: '/science' },
      { label: 'Smart STEM Labs', href: '/p/environment-smart-stem-labs-design-to-execution' },
      { label: 'Gamified Math Lab', href: '/mathematics' },
      { label: 'Phygital Modern Library', href: '/libraries' },
    ],
  },
  {
    title: 'Sports & Fitness',
    items: [
      { label: 'Smart Sports Infrastructure', href: '/sports' },
      { label: 'Synthetic Turf & Courts', href: '/sports' },
      { label: 'Indoor Play & Movement', href: '/p/environment-indoor-play-n-activity-rooms' },
      { label: 'Physical Activity Studios', href: '/p/environment-kindergarten-primary-physical-activity-room' },
    ],
  },
  {
    title: 'Technology & Spaces',
    items: [
      { label: 'Digital Infrastructure', href: '/digital' },
      { label: 'Interactive Panels (IFP)', href: '/p/16-latetest-' },
      { label: '20 AI Tools for Schools', href: '/p/20-ai-tools' },
      { label: 'Campus Architecture', href: '/school-building-design' },
      { label: 'Learning Environments', href: '/environments' },
    ],
  },
];

export const DEFAULT_BRANDS: FooterLinkItem[] = [
  { label: 'European Educational Group', href: '/partnerships' },
  { label: 'MAXHUB Smart Displays', href: '/digital' },
  { label: 'SportSurf Turf Systems', href: '/sports' },
  { label: 'ViewSonic Panels', href: '/digital' },
  { label: 'Wondergartens Play', href: '/p/wondergartens' },
  { label: 'Little Tikes Commercial', href: '/p/environment-indoor-play-n-activity-rooms' },
  { label: 'ButterflyFields STEM', href: '/labs' },
  { label: 'ALTOP Lab Equipment', href: '/science' },
];

export const DEFAULT_TRENDING: FooterLinkItem[] = [
  { label: 'NEP Ready Ultra Modern Labs', href: '/labs' },
  { label: 'STEM Lab Design', href: '/p/environment-smart-stem-labs-design-to-execution' },
  { label: 'Futuristic School Architecture', href: '/school-building-design' },
  { label: 'Digitisation of Entire Campus', href: '/digital' },
  { label: 'Art & Craft Studios', href: '/p/environment-art-craft-rooms' },
  { label: 'Dining Hall Design to Execution', href: '/p/environment-dining-hall-design-to-execution' },
  { label: 'Interactive Learning Walls', href: '/p/interactivities-walls' },
  { label: '50 Global Resources Guide', href: '/p/guide-50-global-resources-for-school-excellence' },
  { label: 'School Buy & Sell Exchange', href: '/school-sale' },
];

export const DEFAULT_COPYRIGHT = '© 2016-2026, Third Eye Retail Pvt. Ltd. | SchoolMart Consortium';

export const DEFAULT_POLICY_LINKS: FooterLinkItem[] = [
  { label: 'Shipping & Transit Policy', href: '/shipping-policy' },
  { label: 'Cancellation Policy', href: '/cancellation-policy' },
  { label: 'Replacement & Return', href: '/replacement-return' },
  { label: 'Order Rejection Policy', href: '/order-rejection-policy' },
  { label: 'Payments & Escrow Terms', href: '/payments' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms-of-use' },
];

const DEFAULT_SOCIAL_URLS: Record<string, string> = {
  social_facebook: 'https://www.facebook.com/schoolmart.in/',
  social_twitter: 'https://x.com/schoolmartindia',
  social_youtube: 'https://www.youtube.com/@schoolmartindia',
  social_instagram: 'https://www.instagram.com/schoolmart.in/',
  social_linkedin: 'https://www.linkedin.com/company/schoolmart/',
  social_pinterest: 'https://in.pinterest.com/schoolmartindia/',
};

// Helper to determine if link is an external absolute URL
const isExternalUrl = (url: string) => /^https?:\/\//i.test(url);

const FooterLink = ({ href, label, className = 'footer-link text-sm' }: { href: string; label: string; className?: string }) => {
  if (isExternalUrl(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {label}
    </Link>
  );
};

const Footer = () => {
  const footerRef = useRef<HTMLElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const { content } = useSiteContent();

  const resolveSocialUrl = (key: string) => (key in content ? content[key] : DEFAULT_SOCIAL_URLS[key]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Footer wipe up (plays on mount rather than being scroll-gated, so a short
      // page never leaves the footer permanently clipped if the scroll trigger's
      // start position ends up past the page's actual max scroll)
      gsap.fromTo(
        footerRef.current,
        { clipPath: 'inset(100% 0 0 0)' },
        {
          clipPath: 'inset(0% 0 0 0)',
          duration: 0.8,
          ease: 'power3.out',
        }
      );

      // Columns fade up
      const columns = columnsRef.current?.children;
      if (columns) {
        gsap.fromTo(
          columns,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.1,
            delay: 0.2,
            ease: 'power3.out',
          }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  // Dynamic Footer Settings resolution with bulletproof fallbacks
  const rawFooterSettings = content?.footer_settings;
  let parsedSettings: FooterSettingsData = {};
  if (typeof rawFooterSettings === 'string') {
    try {
      parsedSettings = JSON.parse(rawFooterSettings);
    } catch {
      parsedSettings = {};
    }
  } else if (rawFooterSettings && typeof rawFooterSettings === 'object') {
    parsedSettings = rawFooterSettings;
  }

  const aboutText = (typeof parsedSettings.aboutText === 'string' && parsedSettings.aboutText.trim())
    ? parsedSettings.aboutText
    : (typeof content?.about_text === 'string' && content.about_text.trim() ? content.about_text : DEFAULT_ABOUT_TEXT);

  const aboutLinks = Array.isArray(parsedSettings.aboutLinks) && parsedSettings.aboutLinks.length > 0
    ? parsedSettings.aboutLinks
    : DEFAULT_ABOUT_LINKS;

  const businessLinks = Array.isArray(parsedSettings.businessLinks) && parsedSettings.businessLinks.length > 0
    ? parsedSettings.businessLinks
    : DEFAULT_BUSINESS_LINKS;

  const categories = Array.isArray(parsedSettings.categories) && parsedSettings.categories.length > 0
    ? parsedSettings.categories
    : DEFAULT_CATEGORIES;

  const brands = Array.isArray(parsedSettings.brands) && parsedSettings.brands.length > 0
    ? parsedSettings.brands
    : DEFAULT_BRANDS;

  const trending = Array.isArray(parsedSettings.trending) && parsedSettings.trending.length > 0
    ? parsedSettings.trending
    : DEFAULT_TRENDING;

  const copyright = (typeof parsedSettings.copyright === 'string' && parsedSettings.copyright.trim())
    ? parsedSettings.copyright
    : DEFAULT_COPYRIGHT;

  const policyLinks = Array.isArray(parsedSettings.policyLinks) && parsedSettings.policyLinks.length > 0
    ? parsedSettings.policyLinks
    : DEFAULT_POLICY_LINKS;

  const socialLinks = [
    { icon: Facebook, key: 'social_facebook', label: 'Facebook' },
    { icon: Twitter, key: 'social_twitter', label: 'X' },
    { icon: Youtube, key: 'social_youtube', label: 'YouTube' },
    { icon: Instagram, key: 'social_instagram', label: 'Instagram' },
    { icon: Linkedin, key: 'social_linkedin', label: 'LinkedIn' },
    {
      icon: () => (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.965 1.406-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.261 7.929-7.261 4.162 0 7.398 2.967 7.398 6.931 0 4.135-2.607 7.462-6.225 7.462-1.214 0-2.354-.63-2.744-1.37l-.749 2.848c-.27 1.031-1.002 2.324-1.492 3.125 1.063.329 2.186.505 3.355.505 6.619 0 11.988-5.37 11.988-11.987C23.991 5.385 18.636 0 12.017 0z"/>
        </svg>
      ),
      key: 'social_pinterest',
      label: 'Pinterest',
    },
  ]
    .map((social) => ({ ...social, href: resolveSocialUrl(social.key) }))
    .filter((social) => social.href);

  return (
    <footer ref={footerRef} className="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div
          ref={columnsRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8"
        >
          {/* About Us */}
          <div className="lg:col-span-1">
            <h3 className="footer-title">About Us</h3>
            <p className="text-gray-300 text-sm mb-4 leading-relaxed">
              {aboutText.startsWith('schoolmart.in') ? (
                <>
                  <Link to="/" className="text-sm-yellow hover:underline">schoolmart.in</Link>
                  {aboutText.slice('schoolmart.in'.length)}
                </>
              ) : aboutText.startsWith('campusmart.in') ? (
                <>
                  <Link to="/" className="text-sm-yellow hover:underline">schoolmart.in</Link>
                  {aboutText.slice('campusmart.in'.length)}
                </>
              ) : (
                aboutText
              )}
            </p>
            <ul className="space-y-2">
              {aboutLinks.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} className="footer-link text-sm" />
                </li>
              ))}
            </ul>
          </div>

          {/* Business */}
          <div className="lg:col-span-1">
            <h3 className="footer-title">Business</h3>
            <ul className="space-y-2">
              {businessLinks.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} label={link.label} className="footer-link text-sm" />
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div className="lg:col-span-2">
            <h3 className="footer-title">Categories</h3>
            <div className="grid grid-cols-2 gap-4">
              {categories.map(({ title, items }) => (
                <div key={title}>
                  <h4 className="text-sm-yellow font-semibold text-sm mb-2">{title}</h4>
                  <ul className="space-y-1">
                    {(items || []).map((item) => (
                      <li key={item.label}>
                        <FooterLink href={item.href} label={item.label} className="footer-link text-xs" />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Brands */}
          <div className="lg:col-span-1">
            <h3 className="footer-title">Brands</h3>
            <ul className="space-y-1">
              {brands.map((brand) => (
                <li key={brand.label}>
                  <FooterLink href={brand.href} label={brand.label} className="footer-link text-xs" />
                </li>
              ))}
            </ul>
          </div>

          {/* What's Trending */}
          <div className="lg:col-span-1">
            <h3 className="footer-title">What's Trending</h3>
            <ul className="space-y-1">
              {trending.map((item) => (
                <li key={item.label}>
                  <FooterLink href={item.href} label={item.label} className="footer-link text-xs" />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-gray-400 text-sm">
              {copyright}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-2">
              {policyLinks.map((link) => (
                <FooterLink
                  key={link.label}
                  href={link.href}
                  label={link.label}
                  className="text-gray-400 hover:text-sm-yellow text-sm transition-colors"
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">Keep in Touch</span>
              <div className="flex items-center gap-2">
                {socialLinks.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-sm-yellow hover:text-sm-navy hover:scale-110 transition-all duration-200"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
