import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import { useSiteContent } from '@/contexts/SiteContentContext';
import { ArrowUpRight } from 'lucide-react';
import { HomeServiceCardsSkeleton } from '@/components/ui/page-skeleton';

gsap.registerPlugin(ScrollTrigger);

export interface ServiceItem {
  title: string;
  description?: string;
  href: string;
  bgColor?: string;
  textColor?: string;
  icon?: any;
  active?: boolean;
}

export const defaultServices: ServiceItem[] = [
  { title: 'Campus Furniture Design', bgColor: '#ef4444', textColor: '#ffffff', href: '/campus-furniture-design', active: true },
  { title: 'Campus Design+ Execution', bgColor: '#a3e635', textColor: '#000000', href: '/campus-design-execution', active: true },
  { title: 'Sports Design+ Execution', bgColor: '#06b6d4', textColor: '#ffffff', href: '/sports-design-execution', active: true },
  { title: 'AI/Digital Design+ Supply', bgColor: '#a855f7', textColor: '#ffffff', href: '/ai-digital-design-supply', active: true },
];

const renderCard = (service: ServiceItem, index: number) => {
  const bg = service.bgColor || ['#ef4444', '#a3e635', '#06b6d4', '#a855f7'][index % 4];
  const text = service.textColor || '#ffffff';
  const link = service.href || '/';

  return (
    <Link
      key={`${service.title}-${index}`}
      to={link}
      className="service-card group relative flex items-center justify-between px-4 sm:px-5 py-2 sm:py-2.5 transition-all duration-200 hover:brightness-105 min-h-[44px] sm:min-h-[48px]"
      style={{ backgroundColor: bg, color: text }}
    >
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <span className="text-[10px] font-black uppercase tracking-wider opacity-75 shrink-0">
          0{index + 1}
        </span>
        <h3 className="font-bold text-xs sm:text-sm tracking-tight truncate">
          {service.title}
        </h3>
      </div>
      <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 group-hover:bg-black/20 shrink-0">
        <ArrowUpRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
};

const ServiceCards = () => {
  const { content, loading } = useSiteContent();
  const rawServices = content.home_services;
  
  const rawList: ServiceItem[] = Array.isArray(rawServices) ? rawServices : [];
  const services: ServiceItem[] = rawList.filter((s) => s.active !== false);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || !services || services.length === 0) return;

    const ctx = gsap.context(() => {
      const cards = cardsRef.current?.querySelectorAll('.service-card');
      if (!cards || cards.length === 0) return;

      gsap.fromTo(
        cards,
        { y: 15, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.06,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 95%',
            toggleActions: 'play none none none',
          },
        }
      );
    });
    return () => ctx.revert();
  }, [services]);

  if (loading) {
    return <HomeServiceCardsSkeleton />;
  }

  // If the admin deliberately removed all service cards, do not render an empty container
  if (!services || services.length === 0) {
    return null;
  }

  // Dynamic layout: If more than 4 cards (e.g. 6 items), row 1 takes first 4 (grid-cols-4),
  // and row 2 takes the remaining items equally divided across 100% width (e.g. 2 items take 50% each in grid-cols-2).
  const hasMultipleRows = services.length > 4;
  const row1 = hasMultipleRows ? services.slice(0, 4) : services;
  const row2 = hasMultipleRows ? services.slice(4) : [];

  const row1Cols = row1.length === 1
    ? 'grid-cols-1'
    : row1.length === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : row1.length === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  const row2Cols = row2.length === 1
    ? 'grid-cols-1'
    : row2.length === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : row2.length === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div ref={containerRef} className="w-full bg-white border-b border-gray-100">
      <div ref={cardsRef} className="w-full flex flex-col">
        {/* Row 1: First 4 cards */}
        <div className={`grid ${row1Cols} w-full`}>
          {row1.map((service, index) => renderCard(service, index))}
        </div>

        {/* Row 2: Remaining cards equally distributed across 100% width (50% each for 2 items) */}
        {row2.length > 0 && (
          <div className={`grid ${row2Cols} w-full`}>
            {row2.map((service, index) => renderCard(service, 4 + index))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceCards;
