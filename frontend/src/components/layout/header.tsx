import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { isAdminSession } from '@/lib/auth-session';
import { useSiteContent } from '@/contexts/SiteContentContext';

export interface NavDropdownItem {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href: string | null;
  hasDropdown?: boolean;
  dropdownItems?: NavDropdownItem[];
}

export const DEFAULT_HEADER_NAV: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Corporate',
    href: '/corporate',
    hasDropdown: true,
    dropdownItems: [
      { label: 'About Us', href: '/about-us' },
      { label: 'Manufacturing', href: '/manufacturing' },
    ],
  },
  { label: 'Catalogues', href: '/catalogues' },
  { label: 'Environments', href: '/environments' },
  { label: 'SHOP', href: 'https://schoolmart.store' },
  { label: 'GUIDES', href: '/guides' },
  { label: 'Contact Us', href: '/contact-us' },
];

const isExternalUrl = (url?: string | null) => !!url && /^https?:\/\//i.test(url);

const MainHeader = () => {
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const location = useLocation();
  const isAdmin = isAdminSession();
  const { content } = useSiteContent();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.5 });

      tl.fromTo(
        headerRef.current,
        { scaleX: 0, transformOrigin: 'left' },
        { scaleX: 1, duration: 0.8, ease: 'power3.out' }
      )
        .fromTo(
          logoRef.current,
          { clipPath: 'circle(0% at 50% 50%)', opacity: 0 },
          { clipPath: 'circle(100% at 50% 50%)', opacity: 1, duration: 0.6, ease: 'power3.out' },
          '-=0.4'
        )
        .fromTo(
          navRef.current?.children || [],
          { y: -30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, stagger: 0.1, ease: 'back.out(1.7)' },
          '-=0.3'
        );
    });

    return () => ctx.revert();
  }, []);

  const navItems: NavItem[] = useMemo(() => {
    const raw = content?.header_navigation;
    if (!raw) return DEFAULT_HEADER_NAV;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_HEADER_NAV;
  }, [content?.header_navigation]);

  const isActive = (path?: string | null) => {
    if (!path) return false;
    const current = location.pathname.toLowerCase();
    const target = path.toLowerCase();
    if (target === '/') {
      return current === '/';
    }
    return current.startsWith(target);
  };

  const isItemActive = (item: NavItem) => {
    if (item.href && isActive(item.href)) return true;
    if (item.dropdownItems && item.dropdownItems.some((d) => isActive(d.href))) return true;
    return false;
  };

  return (
    <header
      ref={headerRef}
      className={`main-header relative z-[70] ${isScrolled ? 'scrolled' : ''}`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className={`header-inner flex items-center justify-between gap-2 sm:gap-4 ${isScrolled ? 'h-12' : 'h-12 sm:h-14'}`}>
          {/* Logo */}
          <div ref={logoRef} className="flex min-w-0 flex-shrink-0">
            <Link to="/" className="flex items-center">
              <div className="h-8 sm:h-10 flex items-center">
                 <img src="/logo.png" alt="SchoolMart" className="h-full w-auto object-contain max-w-[120px] sm:max-w-none" />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:block">
            <ul ref={navRef} className="flex items-center gap-0.5">
              {navItems.map((item) => (
                <li key={item.label} className="relative">
                  {item.hasDropdown ? (
                    <div
                      className="relative"
                      onMouseEnter={() => setDropdownOpen(item.label)}
                      onMouseLeave={() => setDropdownOpen(null)}
                    >
                      {item.href ? (
                        isExternalUrl(item.href) ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`nav-link flex items-center gap-1 ${isItemActive(item) ? 'bg-white/20 text-white rounded-md' : 'text-white'}`}
                          >
                            {item.label}
                            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen === item.label ? 'rotate-180' : ''}`} />
                          </a>
                        ) : (
                          <Link
                            to={item.href}
                            className={`nav-link flex items-center gap-1 ${isItemActive(item) ? 'bg-white/20 text-white rounded-md' : 'text-white'}`}
                          >
                            {item.label}
                            <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen === item.label ? 'rotate-180' : ''}`} />
                          </Link>
                        )
                      ) : (
                        <button
                          className={`nav-link flex items-center gap-1 cursor-pointer ${isItemActive(item) ? 'bg-white/20 text-white rounded-md' : 'text-white'}`}
                          onClick={() => setDropdownOpen(dropdownOpen === item.label ? null : item.label)}
                        >
                          {item.label}
                          <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen === item.label ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                      {dropdownOpen === item.label && item.dropdownItems && (
                        <div className="absolute top-full left-0 pt-2 z-[150] animate-fade-in">
                          <div className="w-56 rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl overflow-hidden ring-1 ring-black/5">
                            {item.dropdownItems.map((dropdownItem) => (
                              isExternalUrl(dropdownItem.href) ? (
                                <a
                                  key={dropdownItem.label}
                                  href={dropdownItem.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block px-4 py-2.5 text-xs uppercase tracking-wider text-slate-700 hover:bg-sm-blue hover:text-white transition-colors font-bold"
                                >
                                  {dropdownItem.label}
                                </a>
                              ) : (
                                <Link
                                  key={dropdownItem.label}
                                  to={dropdownItem.href}
                                  className="block px-4 py-2.5 text-xs uppercase tracking-wider text-slate-700 hover:bg-sm-blue hover:text-white transition-colors font-bold"
                                >
                                  {dropdownItem.label}
                                </Link>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : item.href ? (
                    isExternalUrl(item.href) ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`nav-link ${isActive(item.href) ? 'bg-white/20 text-white rounded-md' : 'text-white'}`}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        to={item.href}
                        className={`nav-link ${isActive(item.href) ? 'bg-white/20 text-white rounded-md' : 'text-white'}`}
                      >
                        {item.label}
                      </Link>
                    )
                  ) : null}
                </li>
              ))}
            </ul>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="lg:hidden border-t border-white/20 py-3">
            <ul className="flex flex-col gap-1.5">
              {navItems.map((item) => (
                <li key={item.label}>
                  {item.hasDropdown ? (
                    <div>
                      <button
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase transition-colors ${isItemActive(item) ? 'bg-white/25 text-white' : 'text-white/90 hover:bg-white/15 hover:text-white'}`}
                        onClick={() => setDropdownOpen(dropdownOpen === item.label ? null : item.label)}
                      >
                        {item.label}
                        <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen === item.label ? 'rotate-180' : ''}`} />
                      </button>
                      {dropdownOpen === item.label && item.dropdownItems && (
                        <div className="mt-1 space-y-1 pl-3 bg-black/10 rounded-lg py-1">
                          {item.dropdownItems.map((dropdownItem) =>
                            isExternalUrl(dropdownItem.href) ? (
                              <a
                                key={dropdownItem.label}
                                href={dropdownItem.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-md px-3 py-2 text-xs text-white/80 hover:text-white transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                {dropdownItem.label}
                              </a>
                            ) : (
                              <Link
                                key={dropdownItem.label}
                                to={dropdownItem.href}
                                className="block rounded-md px-3 py-2 text-xs text-white/80 hover:text-white transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                {dropdownItem.label}
                              </Link>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  ) : item.href ? (
                    isExternalUrl(item.href) ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block rounded-lg px-3 py-2 text-xs font-semibold uppercase transition-colors ${isActive(item.href) ? 'bg-white/25 text-white' : 'text-white/90 hover:bg-white/15 hover:text-white'}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        to={item.href}
                        className={`block rounded-lg px-3 py-2 text-xs font-semibold uppercase transition-colors ${isActive(item.href) ? 'bg-white/25 text-white' : 'text-white/90 hover:bg-white/15 hover:text-white'}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    )
                  ) : null}
                </li>
              ))}
              {isAdmin && (
                <li className="pt-2 border-t border-white/20">
                  <Link
                    to="/admin/dashboard"
                    className="block rounded-lg px-3 py-2 text-xs font-bold uppercase transition-colors bg-sm-navy text-white text-center shadow-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
};

export default MainHeader;
