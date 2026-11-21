import { useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Building2, Users, Target, Award, Handshake, TrendingUp, CheckCircle2 } from 'lucide-react';
import { usePageData } from '@/hooks/usePageData';
import MediaImage from '@/components/ui/media-image';
import { resolveMediaUrl } from '@/lib/media-url';

gsap.registerPlugin(ScrollTrigger);

const STAT_ICONS = [Building2, Users, Target, Award];
const VALUE_ICONS = [Handshake, TrendingUp, Target];

export interface PartnerLogoItem {
  id?: string;
  name?: string;
  image: string;
  href?: string;
}

export interface PartnerCategoryBoxItem {
  id?: string;
  title: string;
  hidden?: boolean;
  width?: 'auto' | 'standard' | 'wide';
  logos: PartnerLogoItem[];
}

export interface PartnerRowItem {
  id?: string;
  title: string;
  type: 'banner' | 'category-boxes';
  hidden?: boolean;
  headerBg?: string;
  bannerLogos?: PartnerLogoItem[];
  categoryBoxes?: PartnerCategoryBoxItem[];
}

const DEFAULTS = {
  heroBadge: 'Est. 2017',
  heroTitle: 'About SchoolMart',
  heroSubtitle: 'We are a consortium of educational architects, laboratory designers, and school infrastructure specialists who deliver transformative learning outcomes through modern classroom, lab, and campus solutions.',
  stats: [
    { value: '4000+', label: 'Partner Schools & Campuses' },
    { value: '7+', label: 'Years of Experience' },
    { value: '100%', label: 'Client Satisfaction' },
    { value: '50+', label: 'Awards Won' },
  ],
  missionBadge: '/ Mission Statement',
  missionTitle: 'Our Mission',
  missionBody1: 'To transform school and educational infrastructure across India by providing comprehensive turnkey solutions that blend physical learning spaces with cutting-edge digital technology. We aim to create classroom and campus environments that inspire, engage, and empower students and educators alike.',
  missionBody2: 'As the premier institutional platform in Asia to bring curriculum-mapped innovations to the school infrastructure industry, we continue to lead the way in educational transformation.',
  missionTag: 'Designing Tomorrow',
  missionImage: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
  whyBulletsBadge: '/ Highlights',
  whyBulletsTitle: 'Why Sign Up Bullets',
  whyBullets: [
    "India's leading Consortium for School Infrastructure",
    "Bespoke Design to Delivery across 100+ categories",
    "Strategic Planning for new Campuses from scratch",
    "4000+ Partner Campuses across India",
    "Exclusive access to global educational brands",
    "NEP 2020 aligned innovation & digital tools"
  ],
  section2Title: 'Our Core Values',
  values: [
    {
      title: 'Partnership',
      description: 'We believe in building long-term partnerships with educational institutions.',
    },
    {
      title: 'Innovation',
      description: 'Constantly evolving to bring the latest technology and design to campuses.',
    },
    {
      title: 'Excellence',
      description: 'Committed to delivering the highest quality in every project we undertake.',
    },
  ],
  teamTitle: 'Governance & Leadership',
  teamSubtitle: 'Driven by a vision to revolutionize the Indian educational landscape.',
  teamTag: 'Executive Team',
  team: [
    { name: 'Rajesh Kumar', role: 'Founder & CEO', image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' },
    { name: 'Priya Sharma', role: 'Chief Design Officer', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' },
    { name: 'Amit Patel', role: 'Head of Operations', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80' },
  ],
  ecosystemTitle: 'Global Ecosystem',
  ecosystemSubtitle: 'Our strength lies in our network of global partners who bring the best of edtech and infrastructure to Indian soil.',
  partnerRows: [] as PartnerRowItem[],
  partnerLogos: [] as PartnerLogoItem[],
};

export const AboutUs = () => {
  const { pathname } = useLocation();
  const slug = pathname === '/' ? 'home' : pathname.replace(/^\//, '');
  
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const missionRef = useRef<HTMLDivElement>(null);
  const { data } = usePageData(slug || 'about-us');

  const heroBadge = data.heroBadge ?? DEFAULTS.heroBadge;
  const heroTitle = data.heroTitle ?? DEFAULTS.heroTitle;
  const heroSubtitle = data.heroSubtitle ?? DEFAULTS.heroSubtitle;

  const statsList: Array<{ value: string; label: string }> = Array.isArray(data.stats) && data.stats.length > 0
    ? data.stats
    : DEFAULTS.stats;

  const valuesList: Array<{ title: string; description: string }> = Array.isArray(data.values) && data.values.length > 0
    ? data.values
    : DEFAULTS.values;

  const teamList: Array<any> = Array.isArray(data.team) && data.team.length > 0
    ? data.team
    : DEFAULTS.team;

  // Dynamic Tiered Partner Rows
  const partnerRows: PartnerRowItem[] = Array.isArray(data.partnerRows) ? data.partnerRows : [];
  const activeRows = partnerRows.filter((r) => r && r.hidden !== true);

  // Fallback for legacy partnerLogos if partnerRows has not been configured yet
  const legacyLogos: PartnerLogoItem[] = Array.isArray(data.partnerLogos)
    ? data.partnerLogos.filter((item: any) => item && (item.image || item.logo))
    : [];

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (heroRef.current) {
        gsap.fromTo(heroRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' });
      }
      
      const stats = statsRef.current?.children;
      if (statsRef.current && stats && stats.length > 0) {
        gsap.fromTo(stats, 
          { opacity: 0, y: 30 }, 
          { 
            opacity: 1, y: 0, 
            duration: 0.8, 
            stagger: 0.1, 
            scrollTrigger: {
              trigger: statsRef.current,
              start: 'top 85%',
            }
          }
        );
      }

      if (missionRef.current) {
        gsap.fromTo(missionRef.current, 
          { scale: 0.95, opacity: 0 }, 
          { 
            scale: 1, opacity: 1, 
            duration: 1, 
            scrollTrigger: {
              trigger: missionRef.current,
              start: 'top 80%',
            }
          }
        );
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <main className="min-h-screen bg-white font-opensans">
      {/* 1. Grand Legacy Hero */}
      {data.hideHero !== true && (
        <section ref={heroRef} className="relative min-h-[40vh] flex items-center bg-cm-blue-dark overflow-hidden py-16 md:py-24 mx-3 sm:mx-6 lg:mx-8 rounded-[2rem] mt-4">
          <div className="absolute inset-0 opacity-10" 
               style={{ backgroundImage: 'radial-gradient(var(--cm-blue) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="w-full mx-auto px-4 sm:px-8 text-center relative z-10">
            <div className="max-w-4xl mx-auto">
              {heroBadge && (
                <span className="text-cm-yellow font-bold uppercase tracking-[0.3em] text-[10px] mb-6 block">
                  {heroBadge}
                </span>
              )}
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight leading-tight">
                {heroTitle}
              </h1>
              <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed font-opensans">
                {heroSubtitle}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 2. Impact Stats Counters */}
      {data.hideStats !== true && statsList.length > 0 && (
        <section className="relative z-20 -mt-10 mb-16 px-4">
          <div className="w-full mx-auto max-w-6xl bg-white shadow-xl rounded-[2rem] p-8 border border-cm-gray">
            <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-8 md:divide-x divide-cm-gray">
              {statsList.map((stat, idx) => {
                const Icon = STAT_ICONS[idx % STAT_ICONS.length] || Building2;
                return (
                  <div key={idx} className="text-center md:px-4 group">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-cm-blue/5 flex items-center justify-center border border-cm-blue/10 group-hover:bg-cm-blue group-hover:scale-105 transition-all duration-500 shadow-md">
                      <Icon className="w-7 h-7 text-cm-blue group-hover:text-white" />
                    </div>
                    <div className="text-3xl font-bold text-cm-blue-dark mb-1 tracking-tighter">{stat.value}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 3. Structured Mission */}
      {data.hideMission !== true && (
        <section ref={missionRef} className="py-16 md:py-20 overflow-hidden">
          <div className="w-full mx-auto px-4 sm:px-8 max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="relative group">
                <div className="absolute -inset-6 bg-cm-blue/10 rounded-[3rem] group-hover:rotate-1 transition-transform duration-1000" />
                <MediaImage
                  src={data.missionImage}
                  fallbackSrc={DEFAULTS.missionImage}
                  alt="SchoolMart Mission"
                  className="relative rounded-[2.5rem] shadow-xl w-full h-[360px] sm:h-[440px] object-cover translate-x-2 grayscale group-hover:grayscale-0 transition-all duration-1000 bg-slate-100"
                />
                <div className="absolute -bottom-6 -right-6 bg-cm-yellow p-6 rounded-2xl shadow-xl">
                  <Building2 className="w-6 h-6 text-cm-blue-dark" />
                </div>
              </div>
              
              <div className="relative">
                <span className="text-cm-blue font-bold uppercase tracking-[0.2em] text-[10px] mb-6 block font-mono">
                  {data.missionBadge ?? DEFAULTS.missionBadge}
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-cm-blue-dark mb-6 leading-tight tracking-tight">
                  {data.missionTitle ?? data.section1Title ?? DEFAULTS.missionTitle}
                </h2>
                <p className="text-lg text-gray-500 leading-relaxed mb-6 border-l-4 border-cm-blue pl-6 py-2">
                  {data.missionBody1 ?? DEFAULTS.missionBody1}
                </p>
                <p className="text-base text-gray-400 leading-relaxed font-opensans">
                  {data.missionBody2 ?? DEFAULTS.missionBody2}
                </p>
                
                <div className="mt-12 flex items-center gap-6">
                  <div className="w-12 h-1 bg-cm-blue" />
                  <span className="text-cm-blue-dark font-bold uppercase tracking-widest text-sm">
                    {data.missionTag ?? DEFAULTS.missionTag}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Why Sign Up Bullets */}
      {data.hideWhyBullets !== true && (
        <section className="py-12 md:py-16 bg-slate-50/80 border-y border-slate-100">
          <div className="w-full mx-auto px-4 sm:px-8 max-w-6xl">
            <div className="mb-8">
              <span className="text-cm-blue font-bold uppercase tracking-[0.2em] text-[10px] mb-2 block font-mono">
                {data.whyBulletsBadge ?? DEFAULTS.whyBulletsBadge}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-cm-blue-dark tracking-tight">
                {data.whyBulletsTitle ?? DEFAULTS.whyBulletsTitle}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Array.isArray(data.whyBullets) ? data.whyBullets : DEFAULTS.whyBullets).map((bullet: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700 font-medium leading-relaxed">{bullet}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. Core Values */}
      {data.hideValues !== true && valuesList.length > 0 && (
        <section className="py-12 md:py-16 bg-cm-gray/30 border-y border-cm-gray rounded-[3rem] mx-4 my-6">
          <div className="w-full mx-auto px-4 sm:px-8 max-w-6xl">
            <div className="mb-8 text-center">
              <h2 className="text-2xl md:text-4xl font-bold text-cm-blue-dark tracking-tighter leading-none">
                {data.section2Title ?? DEFAULTS.section2Title}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {valuesList.map((val, idx) => {
                const Icon = VALUE_ICONS[idx % VALUE_ICONS.length] || Handshake;
                return (
                  <div key={idx} className="bg-white p-10 rounded-[2.5rem] hover:shadow-lg transition-all duration-500 transform hover:-translate-y-2 border border-cm-gray group shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-cm-blue flex items-center justify-center mb-8 shadow-md group-hover:scale-110 transition-transform duration-500">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-cm-blue-dark mb-4 tracking-tight">{val.title}</h3>
                    <p className="text-gray-500 leading-relaxed text-base font-opensans">{val.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 6. Executive Profiles (Leadership Team) */}
      {data.hideTeam !== true && teamList.length > 0 && (
        <section id="team" className="py-12 md:py-16">
          <div className="w-full mx-auto px-4 sm:px-8 max-w-6xl">
            <div className="flex flex-col md:flex-row items-end justify-between mb-8 gap-6">
              <h2 className="text-3xl md:text-5xl font-bold text-cm-blue-dark tracking-tighter leading-none">
                {data.teamTitle ?? DEFAULTS.teamTitle}
              </h2>
              <div className="text-gray-400 font-bold max-w-sm text-right">
                {data.teamSubtitle ?? DEFAULTS.teamSubtitle}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {teamList.map((member: any, idx: number) => (
                <div key={idx} className="group flex flex-col items-center">
                  <div className="relative mb-6 w-full aspect-[4/3] overflow-hidden rounded-2xl shadow-xl border border-gray-100">
                    <MediaImage
                      src={member.image}
                      fallbackSrc="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
                      alt={member.name}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-cm-blue-dark/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-6 left-6 text-white opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-cm-yellow block mb-1 font-opensans">
                        {data.teamTag ?? DEFAULTS.teamTag}
                      </span>
                      <span className="text-lg font-bold">{member.name}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-cm-blue-dark mb-1 tracking-tight">{member.name}</h3>
                  <p className="text-cm-blue font-bold uppercase text-[10px] tracking-[0.2em] font-opensans">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. Dynamic Partner Tiers Matrix (100% Database-Driven, Schema-less, Zero Hardcoding) */}
      {data.hideEcosystem !== true && (activeRows.length > 0 || legacyLogos.length > 0 || data.ecosystemTitle) && (
        <section id="partners" className="py-12 md:py-20 bg-cm-gray/20 border-t border-cm-gray">
          <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            {/* Header Titles */}
            {(data.ecosystemTitle || data.ecosystemSubtitle) && (
              <div className="text-center mb-10 max-w-3xl mx-auto">
                {data.ecosystemTitle && (
                  <h2 className="text-2xl sm:text-4xl font-extrabold text-cm-blue-dark tracking-tight mb-3">
                    {data.ecosystemTitle}
                  </h2>
                )}
                {data.ecosystemSubtitle && (
                  <p className="text-sm sm:text-base text-gray-500 leading-relaxed font-opensans">
                    {data.ecosystemSubtitle}
                  </p>
                )}
              </div>
            )}

            {/* Dynamic Tiered Rows Engine */}
            {activeRows.length > 0 ? (
              <div className="space-y-6 sm:space-y-8">
                {activeRows.map((row, rIdx) => {
                  const headerBg = row.headerBg || '#004B9E';

                  // ─── TYPE A: FULL-WIDTH HORIZONTAL BANNER TIER ─────────────────
                  if (row.type === 'banner') {
                    const bannerLogos = (row.bannerLogos || []).filter((l) => l && (l.image || l.name));
                    return (
                      <div
                        key={row.id || `row-${rIdx}`}
                        className="rounded-2xl border-2 border-[#004B9E] overflow-hidden bg-white shadow-xs"
                      >
                        {/* Solid Blue Banner Header */}
                        {row.title && (
                          <div
                            style={{ backgroundColor: headerBg }}
                            className="py-2.5 px-6 text-center"
                          >
                            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-[0.15em]">
                              {row.title}
                            </h3>
                          </div>
                        )}

                        {/* Logos Area: Divided with hairline dividers */}
                        {bannerLogos.length > 0 ? (
                          <div className="p-4 sm:p-6 flex flex-wrap items-center justify-around divide-y sm:divide-y-0 sm:divide-x divide-slate-200 gap-y-4">
                            {bannerLogos.map((logo, lIdx) => {
                              const content = (
                                <div
                                  key={logo.id || `b-logo-${lIdx}`}
                                  className="flex-1 min-w-[140px] p-3 flex flex-col items-center justify-center text-center group cursor-pointer"
                                  title={logo.name || 'Partner'}
                                >
                                  {logo.image ? (
                                    <div className="h-12 w-full flex items-center justify-center">
                                      <img
                                        src={resolveMediaUrl(logo.image)}
                                        alt={logo.name || 'Partner logo'}
                                        className="max-h-full max-w-[150px] object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300 group-hover:scale-105"
                                        loading="lazy"
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-800 tracking-tight">
                                      {logo.name}
                                    </span>
                                  )}
                                </div>
                              );

                              if (logo.href) {
                                return (
                                  <a
                                    key={logo.id || `b-logo-${lIdx}`}
                                    href={logo.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 min-w-[140px]"
                                  >
                                    {content}
                                  </a>
                                );
                              }
                              return content;
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  }

                  // ─── TYPE B: SEGMENTED CATEGORY BOXES TIER ───────────────────────
                  const activeBoxes = (row.categoryBoxes || []).filter((b) => b && b.hidden !== true);
                  if (activeBoxes.length === 0 && !row.title) return null;

                  return (
                    <div key={row.id || `row-${rIdx}`} className="space-y-3">
                      {/* Optional Row-level Title if provided */}
                      {row.title && (
                        <div className="text-center sm:text-left mb-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            {row.title}
                          </span>
                        </div>
                      )}

                      {/* Responsive Flex/Grid of Category Boxes */}
                      <div className="flex flex-wrap items-stretch gap-4">
                        {activeBoxes.map((box, bIdx) => {
                          const boxLogos = (box.logos || []).filter((l) => l && (l.image || l.name));
                          const logoCount = boxLogos.length;

                          // Auto-sizing calculation: multi-logo categories take proportional expansion
                          let flexClasses = 'flex-1 min-w-[160px] lg:flex-1';
                          if (box.width === 'wide' || logoCount >= 3) {
                            flexClasses = 'flex-1 min-w-[280px] lg:flex-[1.8]';
                          } else if (box.width === 'standard') {
                            flexClasses = 'flex-1 min-w-[160px] lg:flex-1';
                          } else if (logoCount === 2) {
                            flexClasses = 'flex-1 min-w-[220px] lg:flex-[1.3]';
                          }

                          return (
                            <div
                              key={box.id || `box-${bIdx}`}
                              className={`flex flex-col rounded-2xl border-2 border-[#004B9E] overflow-hidden bg-white shadow-xs transition-all duration-300 ${flexClasses}`}
                            >
                              {/* Blue Header Bar */}
                              <div
                                style={{ backgroundColor: headerBg }}
                                className="py-2 px-3 text-center"
                              >
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                  {box.title || 'Partner'}
                                </h4>
                              </div>

                              {/* Box Logo Well */}
                              <div className="p-3 sm:p-4 flex-1 flex items-center justify-center bg-white min-h-[90px]">
                                {logoCount === 0 ? (
                                  <span className="text-xs font-semibold text-slate-400 italic">
                                    To be announced
                                  </span>
                                ) : logoCount === 1 ? (
                                  /* Single Logo View */
                                  (() => {
                                    const single = boxLogos[0];
                                    const itemNode = single.image ? (
                                      <div className="group flex flex-col items-center justify-center cursor-pointer">
                                        <img
                                          src={resolveMediaUrl(single.image)}
                                          alt={single.name || box.title}
                                          className="max-h-12 w-auto max-w-[140px] object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300 group-hover:scale-105"
                                          loading="lazy"
                                        />
                                        {single.name && (
                                          <span className="text-[10px] text-slate-400 font-medium mt-1">
                                            {single.name}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-sm font-bold text-slate-800">
                                        {single.name}
                                      </span>
                                    );

                                    return single.href ? (
                                      <a
                                        href={single.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block"
                                      >
                                        {itemNode}
                                      </a>
                                    ) : (
                                      itemNode
                                    );
                                  })()
                                ) : (
                                  /* Multi-Logo View (Hairline Divided) */
                                  <div className="flex items-center justify-around w-full divide-x divide-slate-200 gap-2">
                                    {boxLogos.map((logo, lIdx) => {
                                      const multiNode = (
                                        <div
                                          key={logo.id || `m-logo-${lIdx}`}
                                          className="flex-1 px-2 flex flex-col items-center justify-center text-center group cursor-pointer"
                                          title={logo.name || 'Partner'}
                                        >
                                          {logo.image ? (
                                            <img
                                              src={resolveMediaUrl(logo.image)}
                                              alt={logo.name || 'Partner logo'}
                                              className="max-h-10 w-auto max-w-[100px] object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300 group-hover:scale-105"
                                              loading="lazy"
                                            />
                                          ) : (
                                            <span className="text-xs font-bold text-slate-800">
                                              {logo.name}
                                            </span>
                                          )}
                                          {logo.name && logo.image && (
                                            <span className="text-[9px] text-slate-400 font-medium truncate max-w-[90px] mt-0.5">
                                              {logo.name}
                                            </span>
                                          )}
                                        </div>
                                      );

                                      if (logo.href) {
                                        return (
                                          <a
                                            key={logo.id || `m-logo-${lIdx}`}
                                            href={logo.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1"
                                          >
                                            {multiNode}
                                          </a>
                                        );
                                      }
                                      return multiNode;
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : legacyLogos.length > 0 ? (
              /* Fallback to centered legacy logo grid if rows not yet created */
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-5 max-w-7xl mx-auto">
                {legacyLogos.map((logo, idx) => (
                  <div
                    key={idx}
                    className="w-28 sm:w-36 h-16 sm:h-20 bg-white rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-md hover:border-cm-blue/30 transition-all duration-300 p-3 flex items-center justify-center group cursor-pointer"
                    title={logo.name || 'Partner Logo'}
                  >
                    <img
                      src={resolveMediaUrl(logo.image)}
                      alt={logo.name || 'Partner Logo'}
                      className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* Bottom CTA Banner */}
      {!data.hideCta && (data.ctaTitle || data.ctaButtonLabel) && (
        <section className="bg-cm-blue-dark py-12 px-4 sm:px-6 lg:px-8 mt-12">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-white">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {data.ctaTitle || "Partner with India's Foremost School Infrastructure Consortium"}
              </h3>
              {data.ctaSubtitle && (
                <p className="text-slate-300 text-sm sm:text-base max-w-2xl">
                  {data.ctaSubtitle}
                </p>
              )}
            </div>
            {data.ctaButtonLabel && (
              <Link
                to={data.ctaHref || '/contact-us'}
                className="shrink-0 px-6 py-3 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-center"
              >
                {data.ctaButtonLabel}
              </Link>
            )}
          </div>
        </section>
      )}

    </main>
  );
};

export default AboutUs;
