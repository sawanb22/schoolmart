import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Package,
  FolderTree,
  Globe,
  Users,
  AlertTriangle,
  ArrowRight,
  RotateCw,
  Heart,
  MessageSquare,
  BookOpen,
  BookMarked,
  Tag,
  FileText,
  Star,
  Search,
  GraduationCap,
} from 'lucide-react';
import api from '../api/client';
import { StatCard, ErrorBanner, PageHeader } from '../components/ui';
import { cn } from '../../lib/utils';

/**
 * Admin dashboard.
 * Deliberately light on the database: one request to GET /admin/stats (7 simple counts).
 * No charts, trends or analytics, and no polling; it only loads when opened or on "Refresh".
 */
export interface DashboardStats {
  users: number;
  products: number;
  orders: number;
  unreadEnquiries: number;
  unreadQuotes: number;
  pendingClassifieds: number;
  totalRevenue: number;
}

interface QuickNavItem {
  to: string;
  icon: typeof Package;
  label: string;
  desc: string;
}

interface QuickNavGroup {
  heading: string;
  items: QuickNavItem[];
}

const quickNavGroups: QuickNavGroup[] = [
  {
    heading: 'Website Content',
    items: [
      { to: '/admin/homepage-editor', icon: Star, label: 'Homepage & Cards', desc: 'Hero, homepage cards and featured blocks' },
      { to: '/admin/pages', icon: Globe, label: 'All Pages', desc: 'Edit every page on the website' },
      { to: '/admin/blog', icon: BookOpen, label: "Blog (What's Trending)", desc: 'Articles, categories and layout' },
      { to: '/admin/solutions-finder', icon: Search, label: 'Solutions Finder', desc: 'Search cards and taxonomy' },
    ],
  },
  {
    heading: 'Products & Catalogue',
    items: [
      { to: '/admin/products', icon: Package, label: 'Products', desc: 'Add, edit or remove products' },
      { to: '/admin/categories', icon: FolderTree, label: 'Categories', desc: 'Product and page categories' },
      { to: '/admin/catalogues', icon: BookMarked, label: 'Catalogues & Case Studies', desc: 'PDF brochures and case studies' },
      { to: '/admin/colleges', icon: GraduationCap, label: 'Colleges for Sale', desc: 'Institution sale listings' },
      { to: '/admin/classifieds', icon: Tag, label: 'Classifieds', desc: 'Opportunities and listings' },
    ],
  },
  {
    heading: 'Enquiries & Leads',
    items: [
      { to: '/admin/enquiries', icon: MessageSquare, label: 'Enquiries', desc: 'Quote requests and messages' },
      { to: '/admin/wishlist-report', icon: Heart, label: 'Wishlist Reports', desc: 'Saved products, leads for quotes' },
    ],
  },
  {
    heading: 'People & Settings',
    items: [
      { to: '/admin/users', icon: Users, label: 'Users', desc: 'Customer and admin accounts' },
      { to: '/admin/site-content', icon: FileText, label: 'Site Settings', desc: 'Contacts, branding and footer' },
    ],
  },
];

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8 animate-pulse" data-testid="dashboard-skeleton">
      <div className="space-y-2 pb-5 border-b border-stone-200">
        <div className="h-7 w-48 bg-stone-200 rounded-md" />
        <div className="h-4 w-72 bg-stone-100 rounded-md" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-stone-100 rounded-xl border border-stone-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-20 bg-stone-100 rounded-xl border border-stone-200" />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await api.get<DashboardStats>('/admin/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
      setError('Could not load the dashboard numbers. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) return <DashboardSkeleton />;

  const unreadQuotes = stats?.unreadQuotes ?? 0;
  const unreadEnquiries = stats?.unreadEnquiries ?? 0;
  const pendingClassifieds = stats?.pendingClassifieds ?? 0;
  const totalAttention = unreadQuotes + unreadEnquiries;

  const show = (n: number | undefined) => (typeof n === 'number' ? n.toLocaleString() : '–');

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Dashboard"
        subtitle="Your SchoolMart control centre. Open any section below."
        className="mb-0"
        actions={
          <button
            type="button"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
          >
            <RotateCw className={cn('w-3.5 h-3.5 text-stone-500', refreshing && 'animate-spin')} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        }
      />

      {error && <ErrorBanner message={error} retry={() => fetchStats(false)} onDismiss={() => setError(null)} />}

      {/* Needs attention: only when there is something unread */}
      {totalAttention > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-amber-950">
                  {totalAttention} unread {totalAttention === 1 ? 'enquiry' : 'enquiries'}
                </h2>
                <p className="text-xs text-amber-800/90 mt-1">
                  {unreadQuotes} quote {unreadQuotes === 1 ? 'request' : 'requests'} · {unreadEnquiries} contact{' '}
                  {unreadEnquiries === 1 ? 'message' : 'messages'}
                </p>
              </div>
            </div>
            <Link
              to="/admin/enquiries"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors shrink-0"
            >
              <span>Review enquiries</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Key numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Products"
          value={show(stats?.products)}
          subtitle="Live in the catalogue"
          icon={Package}
          onClick={() => navigate('/admin/products')}
        />
        <StatCard
          title="Unread Enquiries"
          value={show(stats ? totalAttention : undefined)}
          subtitle="Quotes and contact messages"
          icon={MessageSquare}
          onClick={() => navigate('/admin/enquiries')}
        />
        <StatCard
          title="Pending Classifieds"
          value={show(stats ? pendingClassifieds : undefined)}
          subtitle="Waiting for review"
          icon={Tag}
          onClick={() => navigate('/admin/classifieds')}
        />
        <StatCard
          title="Registered Users"
          value={show(stats?.users)}
          subtitle="Customer and admin accounts"
          icon={Users}
          onClick={() => navigate('/admin/users')}
        />
      </div>

      {/* Quick navigation */}
      <div className="space-y-6">
        {quickNavGroups.map((group) => (
          <section key={group.heading} className="space-y-3">
            <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider">{group.heading}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {group.items.map(({ to, icon: Icon, label, desc }) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex items-start gap-3.5 p-4 rounded-xl bg-white border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-stone-50 text-[#1e3a8a] border border-stone-200/80 group-hover:bg-blue-50 group-hover:border-blue-100 flex items-center justify-center shrink-0 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-stone-800 group-hover:text-[#1e3a8a] transition-colors">
                      {label}
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5 leading-relaxed">{desc}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-stone-600 transition-colors shrink-0 mt-0.5" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
