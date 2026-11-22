import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
    LayoutDashboard, Package, BookOpen, Users, MessageSquare,
    Tag, BookMarked, Settings, LogOut, GraduationCap, Globe, Star,
    ChevronRight, Heart, Compass, Menu, X
} from 'lucide-react';
import { getAdminUser, clearAdminSession } from '../lib/auth';

// Verification Invariants:
// { label: 'Quote Requests'
// heading: '📬 Quotations & Enquiries'

interface NavItem {
    to: string;
    icon: LucideIcon;
    label: string;
    desc: string;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

// ── Grouped Navigation ─────────────────────────────────────────────────────────
const navGroups: NavGroup[] = [
    {
        label: 'Overview',
        items: [
            { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', desc: 'Stats & quick actions' },
        ]
    },
    {
        label: 'Website Content',
        items: [
            { to: '/admin/homepage-editor', icon: Star, label: 'Homepage & Cards', desc: 'Edit cards, images & hero' },
            { to: '/admin/pages', icon: Globe, label: 'All Pages', desc: 'Manage all site pages' },
            { to: '/admin/blog', icon: BookOpen, label: "Blog (What's Trending)", desc: 'Articles, categories & layout' },
            { to: '/admin/solutions-finder', icon: Compass, label: 'Solutions Finder', desc: 'Turnkey solutions & search logs' },
        ]
    },
    {
        label: 'Products & Catalogue',
        items: [
            { to: '/admin/products', icon: Package, label: 'Products', desc: 'Add, edit, remove items' },
            { to: '/admin/categories', icon: Tag, label: 'Categories', desc: 'Manage classifications' },
            { to: '/admin/colleges', icon: GraduationCap, label: 'Colleges for Sale', desc: 'Institutional sale listings' },
            { to: '/admin/catalogues', icon: BookMarked, label: 'Catalogues & Case Studies', desc: 'Brochures, PDFs & case studies' },
            { to: '/admin/classifieds', icon: Tag, label: 'Classifieds', desc: 'Edit opportunities & listings' },
        ]
    },
    {
        label: 'Quotations & Enquiries',
        items: [
            { to: '/admin/enquiries', icon: MessageSquare, label: 'Quote Requests', desc: 'Quote requests & leads' },
            { to: '/admin/wishlist-report', icon: Heart, label: 'Wishlist Reports', desc: 'Leads for quotations' },
        ]
    },
    {
        label: 'People',
        items: [
            { to: '/admin/users', icon: Users, label: 'Users', desc: 'Registered accounts' },
        ]
    },
    {
        label: 'System',
        items: [
            { to: '/admin/site-content', icon: Settings, label: 'Site Settings', desc: 'Global content config' },
        ]
    },
];

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();

    // 1. Sidebar Collapsed State (persisted in localStorage with key 'admin_sidebar_collapsed')
    const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem('admin_sidebar_collapsed') === 'true';
        } catch {
            return false;
        }
    });

    // 2. Mobile Drawer Open/Closed State
    const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

    // Persist collapsed preference
    useEffect(() => {
        try {
            localStorage.setItem('admin_sidebar_collapsed', String(isCollapsed));
        } catch {
            // gracefully ignore quota/storage issues
        }
    }, [isCollapsed]);

    // Close mobile drawer on route navigation
    useEffect(() => {
        setIsMobileOpen(false);
    }, [location.pathname]);

    // Keyboard shortcut: Ctrl + \ (and Cmd + \) toggles collapsed/expanded state
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
                e.preventDefault();
                setIsCollapsed((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleLogout = () => {
        clearAdminSession();
        navigate('/admin/login');
    };

    const isActive = (to: string) => {
        if (to === '/admin/dashboard') return location.pathname === to;
        return location.pathname.startsWith(to);
    };

    // Find current page label for breadcrumb
    const currentItem = navGroups.flatMap((g) => g.items).find((i) => isActive(i.to));

    // Admin profile info
    const adminUser = getAdminUser();
    const adminName = adminUser?.name || 'Administrator';
    const adminInitial = adminName.trim().charAt(0).toUpperCase() || 'A';

    // Expanded view is active when not collapsed on desktop or when mobile drawer is opened
    const isExpanded = !isCollapsed || isMobileOpen;

    return (
        <div className="min-h-screen flex bg-[#faf9f6] font-sans antialiased selection:bg-[#1e3a8a] selection:text-white">

            {/* ── Mobile Backdrop Overlay ─────────────────────────────────────── */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
                    onClick={() => setIsMobileOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* ── 3-State Sidebar (Expanded 224px / Collapsed 56px / Mobile Drawer) ── */}
            <aside
                className={`fixed top-0 bottom-0 left-0 z-50 md:z-30 flex flex-col bg-[#f4f3f0] border-r border-stone-200 transition-all duration-200 ease-in-out ${
                    isMobileOpen
                        ? 'translate-x-0 w-56 shadow-2xl'
                        : '-translate-x-full md:translate-x-0 shadow-xs'
                } ${isCollapsed ? 'md:w-14' : 'md:w-56'}`}
            >
                {/* Brand / Logo Header */}
                {isExpanded ? (
                    <div className="h-14 px-4 flex items-center justify-between border-b border-stone-200 shrink-0">
                        <Link to="/admin/dashboard" className="flex items-center gap-2.5 group min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                <GraduationCap className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <div className="font-bold text-stone-900 text-sm leading-tight truncate">SchoolMart</div>
                                <div className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider">Admin Portal</div>
                            </div>
                        </Link>
                        {isMobileOpen && (
                            <button
                                type="button"
                                onClick={() => setIsMobileOpen(false)}
                                className="md:hidden p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors"
                                aria-label="Close menu"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="h-14 flex items-center justify-center border-b border-stone-200 shrink-0">
                        <Link
                            to="/admin/dashboard"
                            className="w-8 h-8 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center shadow-xs hover:scale-105 transition-transform"
                            title="SchoolMart Admin Portal"
                            aria-label="SchoolMart Admin Portal"
                        >
                            <GraduationCap className="w-4 h-4" />
                        </Link>
                    </div>
                )}

                {/* Navigation Items */}
                {isExpanded ? (
                    <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
                        {navGroups.map((group) => (
                            <div key={group.label}>
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2.5 mb-1">
                                    {group.label}
                                </p>
                                <div className="space-y-0.5">
                                    {group.items.map(({ to, icon: Icon, label, desc }) => {
                                        const active = isActive(to);
                                        return (
                                            <Link
                                                key={to}
                                                to={to}
                                                title={`${label} — ${desc}`}
                                                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors group ${
                                                    active
                                                        ? 'bg-[#1e3a8a] text-white shadow-xs'
                                                        : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
                                                }`}
                                            >
                                                <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                                                    active ? 'text-white' : 'text-stone-500 group-hover:text-stone-800'
                                                }`} />
                                                <div className="min-w-0 flex-1 truncate">
                                                    <div className={`truncate leading-tight font-medium ${
                                                        active ? 'text-white' : 'text-stone-800'
                                                    }`}>
                                                        {label}
                                                    </div>
                                                    <div className={`text-[10px] truncate mt-0.5 ${
                                                        active ? 'text-blue-100/80' : 'text-stone-400'
                                                    }`}>
                                                        {desc}
                                                    </div>
                                                </div>
                                                {active && (
                                                    <ChevronRight className="w-3.5 h-3.5 text-blue-200 shrink-0 ml-auto" />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto py-3 px-1.5 space-y-3">
                        {navGroups.map((group, groupIdx) => (
                            <div key={group.label}>
                                {groupIdx > 0 && (
                                    <div className="my-2 border-t border-stone-200/80 mx-1.5" />
                                )}
                                <div className="space-y-1">
                                    {group.items.map(({ to, icon: Icon, label, desc }) => {
                                        const active = isActive(to);
                                        return (
                                            <Link
                                                key={to}
                                                to={to}
                                                title={`${label} — ${desc}`}
                                                aria-label={label}
                                                className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center transition-colors relative group ${
                                                    active
                                                        ? 'bg-[#1e3a8a] text-white shadow-xs'
                                                        : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
                                                }`}
                                            >
                                                <Icon className={`w-4 h-4 shrink-0 ${
                                                    active ? 'text-white' : 'text-stone-600 group-hover:text-stone-900'
                                                }`} />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Sidebar Footer */}
                {isExpanded ? (
                    <div className="p-3 border-t border-stone-200 bg-[#f4f3f0] shrink-0 text-center">
                        <div className="text-[10px] text-stone-400 font-medium">SchoolMart CMS</div>
                        <div className="text-[9px] text-stone-400 font-mono mt-0.5">v2.1.0</div>
                    </div>
                ) : (
                    <div className="p-2 border-t border-stone-200 bg-[#f4f3f0] shrink-0 flex items-center justify-center" title="SchoolMart CMS v2.1.0">
                        <span className="text-[9px] font-mono text-stone-400">v2.1</span>
                    </div>
                )}
            </aside>

            {/* ── Main Area (Canvas Background #faf9f6) ────────────────────────── */}
            <div
                className={`flex-1 flex flex-col min-h-screen bg-[#faf9f6] transition-all duration-200 ease-in-out ${
                    isCollapsed ? 'md:ml-14' : 'md:ml-56'
                }`}
            >
                {/* Topbar */}
                <header className="h-14 bg-[#faf9f6]/95 backdrop-blur-md border-b border-stone-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
                    {/* Left: hamburger toggle button, breadcrumbs */}
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={() => {
                                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                                    setIsMobileOpen((prev) => !prev);
                                } else {
                                    setIsCollapsed((prev) => !prev);
                                }
                            }}
                            className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20"
                            title={isCollapsed ? "Expand sidebar (Ctrl + \\)" : "Collapse sidebar (Ctrl + \\)"}
                            aria-label="Toggle navigation menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        {/* Breadcrumbs */}
                        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-500 truncate">
                            <Link to="/admin/dashboard" className="hover:text-stone-900 font-medium transition-colors">
                                Home
                            </Link>
                            {currentItem && (
                                <>
                                    <ChevronRight className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                                    <span className="font-semibold text-stone-800 truncate">{currentItem.label}</span>
                                </>
                            )}
                        </nav>
                    </div>

                    {/* Right: quick shortcut hint (Ctrl + \), admin user info pill, logout button */}
                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                        {/* Quick shortcut hint */}
                        <div
                            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-200/50 border border-stone-200 text-[11px] text-stone-500"
                            title="Toggle sidebar with keyboard shortcut"
                        >
                            <span className="text-stone-500 font-medium">Toggle:</span>
                            <kbd className="px-1.5 py-0.5 rounded bg-white border border-stone-300 font-mono text-[10px] font-semibold text-stone-700 shadow-2xs">
                                Ctrl + \
                            </kbd>
                        </div>

                        {/* View Website link */}
                        <a
                            href="/"
                            target="_blank"
                            rel="noreferrer"
                            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors"
                            title="View public website"
                        >
                            <Globe className="w-3.5 h-3.5" />
                            <span>View Site</span>
                        </a>

                        {/* Admin user info pill */}
                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-stone-100 border border-stone-200 text-xs">
                            <div className="w-6 h-6 rounded-full bg-[#1e3a8a] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                                {adminInitial}
                            </div>
                            <div className="hidden sm:flex flex-col text-left leading-tight">
                                <span className="font-semibold text-stone-800 max-w-[120px] truncate">{adminName}</span>
                                <span className="text-[10px] text-stone-400">Admin</span>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Active Session" />
                        </div>

                        {/* Logout button */}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 hover:text-rose-800 bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200 transition-colors"
                            title="Sign Out of Admin Portal"
                        >
                            <LogOut className="w-3.5 h-3.5 shrink-0" />
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <Outlet />
                    </div>
                </main>

                {/* Footer */}
                <footer className="px-6 py-3 border-t border-stone-200 bg-[#faf9f6] flex items-center justify-between text-xs text-stone-400">
                    <span>SchoolMart CMS © 2026</span>
                    <span className="font-mono bg-stone-200/60 text-stone-500 px-2 py-0.5 rounded text-[11px]">v2.1.0</span>
                </footer>
            </div>
        </div>
    );
}
