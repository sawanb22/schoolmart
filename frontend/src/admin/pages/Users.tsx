import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
    Users as UsersIcon,
    ShieldCheck,
    UserCheck,
    Plus,
    Trash2,
    X,
    Eye,
    EyeOff,
    Sparkles,
    AlertCircle,
    Loader2,
    Calendar,
    Phone,
    Building2,
    Mail,
} from 'lucide-react';
import api from '../api/client';
import { getAdminUser } from '../lib/auth';
import { cn } from '../../lib/utils';
import { tableStyles } from '../components/ui/tableStyles';
import { AdminPagination } from '../components/ui/AdminPagination';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SearchInput } from '../components/ui/SearchInput';
import { Tabs, type TabItem } from '../components/ui/Tabs';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';

export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    phone?: string;
    institution?: string;
    createdAt: string;
}

export interface NewUserForm {
    name: string;
    email: string;
    password: string;
    role: 'user' | 'admin';
    phone: string;
    institution: string;
}

interface ApiErrorResponse {
    error?: string;
    message?: string;
}

function getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: ApiErrorResponse } }).response;
        if (response?.data?.error) return response.data.error;
        if (response?.data?.message) return response.data.message;
    }
    if (err instanceof Error) return err.message;
    return fallback;
}

const INITIAL_FORM: NewUserForm = {
    name: '',
    email: '',
    password: '',
    role: 'user',
    phone: '',
    institution: '',
};

const PAGE_SIZE = 20;

export default function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);

    // Filter and search state
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
    const [page, setPage] = useState(1);

    // Add user modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState<NewUserForm>(INITIAL_FORM);
    const [showPassword, setShowPassword] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    // Delete user modal state
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Role updating state
    const [roleUpdatingId, setRoleUpdatingId] = useState<number | null>(null);

    const currentUser = getAdminUser();

    const fetchUsers = async () => {
        setLoading(true);
        setPageError(null);
        try {
            const { data } = await api.get('/admin/users');
            const list: User[] = Array.isArray(data)
                ? data
                : Array.isArray(data?.users)
                    ? data.users
                    : Array.isArray(data?.items)
                        ? data.items
                        : [];
            setUsers(list);
        } catch (err: unknown) {
            console.error('Failed to fetch users:', err);
            setPageError(getErrorMessage(err, 'Failed to fetch users'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Metric counts
    const totalUsersCount = users.length;
    const adminCount = useMemo(() => users.filter((u) => u.role === 'admin').length, [users]);
    const standardUserCount = totalUsersCount - adminCount;

    // Filtered user list
    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();
        return users.filter((u) => {
            const matchesRole = roleFilter === 'all' || u.role === roleFilter;
            if (!matchesRole) return false;

            if (!query) return true;
            const nameMatch = u.name.toLowerCase().includes(query);
            const emailMatch = u.email.toLowerCase().includes(query);
            const instMatch = Boolean(u.institution && u.institution.toLowerCase().includes(query));
            const phoneMatch = Boolean(u.phone && u.phone.toLowerCase().includes(query));

            return nameMatch || emailMatch || instMatch || phoneMatch;
        });
    }, [users, search, roleFilter]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    const paginatedUsers = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredUsers.slice(start, start + PAGE_SIZE);
    }, [filteredUsers, page]);

    // Role tabs configuration
    const roleTabs: TabItem<'all' | 'admin' | 'user'>[] = [
        { id: 'all', label: 'All Users', count: totalUsersCount },
        { id: 'admin', label: 'Administrators', count: adminCount },
        { id: 'user', label: 'Institutional Customers', count: standardUserCount },
    ];

    // Role update handler with self-demotion & last-admin protection
    const updateRole = async (id: number, role: string) => {
        if (currentUser?.id === id && role !== 'admin') {
            setPageError('You cannot demote your own administrator account');
            return;
        }
        if (role !== 'admin' && adminCount <= 1) {
            const target = users.find((u) => u.id === id);
            if (target?.role === 'admin') {
                setPageError('Cannot demote the last remaining administrator');
                return;
            }
        }

        setRoleUpdatingId(id);
        setPageError(null);
        try {
            await api.put(`/admin/users/${id}/role`, { role });
            setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
        } catch (err: unknown) {
            console.error('Failed to update role:', err);
            setPageError(getErrorMessage(err, 'Failed to update user role'));
        } finally {
            setRoleUpdatingId(null);
        }
    };

    // Generate cryptographically secure strong password
    const generatePassword = () => {
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        const numbers = '23456789';
        const symbols = '!@#$%&*';
        const all = letters + numbers + symbols;

        const getRandomInt = (max: number): number => {
            if (max <= 0) return 0;
            // Modulo bias reduction using rejection sampling
            const maxUint32 = 0x100000000;
            const limit = Math.floor(maxUint32 / max) * max;
            const array = new Uint32Array(1);
            do {
                window.crypto.getRandomValues(array);
            } while (array[0] >= limit);
            return array[0] % max;
        };

        const chars: string[] = [
            letters.charAt(getRandomInt(letters.length)),
            numbers.charAt(getRandomInt(numbers.length)),
            symbols.charAt(getRandomInt(symbols.length)),
        ];

        for (let i = 3; i < 10; i++) {
            chars.push(all.charAt(getRandomInt(all.length)));
        }

        // Secure Fisher-Yates shuffle
        for (let i = chars.length - 1; i > 0; i--) {
            const j = getRandomInt(i + 1);
            const temp = chars[i];
            chars[i] = chars[j];
            chars[j] = temp;
        }

        const pass = chars.join('');

        setFormData((prev) => ({ ...prev, password: pass }));
        setShowPassword(true);
    };

    // Open Add Modal
    const openAddModal = () => {
        setFormData(INITIAL_FORM);
        setAddError(null);
        setShowPassword(false);
        setShowAddModal(true);
    };

    // Submit Add User
    const handleAddSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setAddError(null);

        if (!formData.name.trim()) {
            setAddError('Name is required');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
            setAddError('Please enter a valid email address');
            return;
        }

        if (!formData.password || formData.password.length < 6) {
            setAddError('Password must be at least 6 characters');
            return;
        }

        setAddLoading(true);
        try {
            const { data } = await api.post('/admin/users', {
                name: formData.name.trim(),
                email: formData.email.trim(),
                password: formData.password,
                role: formData.role,
                phone: formData.phone.trim() || undefined,
                institution: formData.institution.trim() || undefined,
            });

            // Append new user to list
            setUsers((prev) => [data, ...prev]);
            setShowAddModal(false);
            setFormData(INITIAL_FORM);
        } catch (err: unknown) {
            console.error('Failed to create user:', err);
            setAddError(getErrorMessage(err, 'Failed to create user. Please check your inputs.'));
        } finally {
            setAddLoading(false);
        }
    };

    // Confirm Delete User with guards
    const handleDeleteConfirm = async () => {
        if (!deletingUser) return;
        if (currentUser?.id === deletingUser.id) {
            setDeleteError('You cannot delete your own administrator account');
            return;
        }
        if (deletingUser.role === 'admin' && adminCount <= 1) {
            setDeleteError('Cannot delete the last remaining administrator');
            return;
        }

        setDeleteError(null);
        setDeleteLoading(true);

        try {
            await api.delete(`/admin/users/${deletingUser.id}`);
            setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
            setDeletingUser(null);
        } catch (err: unknown) {
            console.error('Failed to delete user:', err);
            setDeleteError(getErrorMessage(err, 'Failed to delete user'));
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <PageHeader
                title="Users"
                subtitle="Manage platform accounts, administrator roles, and access control."
                actions={
                    <button
                        type="button"
                        onClick={openAddModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1e3a8a] text-white text-xs font-semibold hover:bg-[#172554] shadow-2xs transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add New User</span>
                    </button>
                }
            />

            {/* Metric Pills / Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    title="Total Users"
                    value={totalUsersCount}
                    subtitle="Registered platform accounts"
                    icon={UsersIcon}
                />
                <StatCard
                    title="Administrators"
                    value={adminCount}
                    subtitle="Full dashboard privileges"
                    icon={ShieldCheck}
                />
                <StatCard
                    title="Standard Users"
                    value={standardUserCount}
                    subtitle="Institutional customers & faculty"
                    icon={UserCheck}
                />
            </div>

            {/* Global Error Banner */}
            {pageError && (
                <ErrorBanner
                    message={pageError}
                    onDismiss={() => setPageError(null)}
                />
            )}

            {/* Filter & Live Search Toolbar */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                {/* Search Bar */}
                <SearchInput
                    value={search}
                    onChange={(val) => {
                        setSearch(val);
                        setPage(1);
                    }}
                    placeholder="Search by name, email, or institution..."
                    className="w-full md:w-96"
                />

                {/* Role Tabs */}
                <Tabs
                    tabs={roleTabs}
                    activeTab={roleFilter}
                    onChange={(tabId) => {
                        setRoleFilter(tabId);
                        setPage(1);
                    }}
                />
            </div>

            {/* Users Table Card */}
            <div className="bg-white border border-stone-200 rounded-xl shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className={tableStyles.table}>
                        <thead className={tableStyles.thead}>
                            <tr>
                                <th className={tableStyles.th}>User</th>
                                <th className={tableStyles.th}>Contact</th>
                                <th className={tableStyles.th}>Institution</th>
                                <th className={tableStyles.th}>Role</th>
                                <th className={tableStyles.th}>Joined</th>
                                <th className={tableStyles.th}>Manage Role</th>
                                <th className={cn(tableStyles.th, 'text-right')}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={tableStyles.tbody}>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className={tableStyles.td}><div className="h-4 bg-stone-100 rounded w-36 mb-1" /><div className="h-3 bg-stone-50 rounded w-24" /></td>
                                        <td className={tableStyles.td}><div className="h-4 bg-stone-100 rounded w-24" /></td>
                                        <td className={tableStyles.td}><div className="h-4 bg-stone-100 rounded w-28" /></td>
                                        <td className={tableStyles.td}><div className="h-5 bg-stone-100 rounded-full w-20" /></td>
                                        <td className={tableStyles.td}><div className="h-4 bg-stone-100 rounded w-20" /></td>
                                        <td className={tableStyles.td}><div className="h-7 bg-stone-100 rounded w-20" /></td>
                                        <td className={cn(tableStyles.td, 'text-right')}><div className="h-7 bg-stone-100 rounded-lg w-8 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : paginatedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-6">
                                        <EmptyState
                                            title="No users found"
                                            description={
                                                search
                                                    ? `No users match "${search}". Try adjusting your search query.`
                                                    : 'No users registered yet.'
                                            }
                                            actionLabel={search || roleFilter !== 'all' ? 'Clear Filters' : undefined}
                                            onAction={
                                                search || roleFilter !== 'all'
                                                    ? () => {
                                                        setSearch('');
                                                        setRoleFilter('all');
                                                        setPage(1);
                                                    }
                                                    : undefined
                                            }
                                        />
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map((u) => {
                                    const isSelf = currentUser?.id === u.id;
                                    const isLastAdmin = u.role === 'admin' && adminCount <= 1;
                                    return (
                                        <tr key={u.id} className={tableStyles.tr}>
                                            {/* User Name & Email */}
                                            <td className={tableStyles.td}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1e3a8a] border border-blue-100 font-bold flex items-center justify-center text-xs shrink-0 uppercase">
                                                        {u.name.charAt(0) || 'U'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-stone-900 flex items-center gap-1.5 truncate">
                                                            <span>{u.name}</span>
                                                            {isSelf && (
                                                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-blue-50 text-[#1e3a8a] rounded border border-blue-200">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5 truncate">
                                                            <Mail className="w-3 h-3 text-stone-400 shrink-0" />
                                                            <span className="truncate">{u.email}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Phone */}
                                            <td className={tableStyles.td}>
                                                {u.phone ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-stone-700">
                                                        <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                                                        <span>{u.phone}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-stone-300 text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Institution */}
                                            <td className={tableStyles.td}>
                                                {u.institution ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-stone-700 max-w-xs truncate" title={u.institution}>
                                                        <Building2 className="w-3 h-3 text-stone-400 shrink-0" />
                                                        <span className="truncate">{u.institution}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-stone-300 text-xs">—</span>
                                                )}
                                            </td>

                                            {/* Role Badge */}
                                            <td className={tableStyles.td}>
                                                <StatusBadge
                                                    status={u.role === 'admin' ? 'admin' : 'customer'}
                                                    label={u.role === 'admin' ? 'Administrator' : 'Customer'}
                                                />
                                            </td>

                                            {/* Joined Date */}
                                            <td className={tableStyles.td}>
                                                <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                                                    <Calendar className="w-3 h-3 text-stone-400 shrink-0" />
                                                    <span>
                                                        {new Date(u.createdAt).toLocaleDateString('en-IN', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })}
                                                    </span>
                                                </span>
                                            </td>

                                            {/* Manage Role Dropdown */}
                                            <td className={tableStyles.td}>
                                                <div className="relative inline-flex items-center gap-1.5">
                                                    <select
                                                        value={u.role}
                                                        disabled={roleUpdatingId === u.id || (isSelf && u.role === 'admin')}
                                                        onChange={(e) => updateRole(u.id, e.target.value)}
                                                        aria-label="Manage Role"
                                                        title={isSelf ? 'You cannot demote your own administrator account' : undefined}
                                                        className="border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-medium bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition-colors"
                                                    >
                                                        <option value="user">User</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                    {roleUpdatingId === u.id && (
                                                        <Loader2 className="w-3 h-3 animate-spin text-[#1e3a8a]" />
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions: Delete Button */}
                                            <td className={cn(tableStyles.td, 'text-right')}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDeletingUser(u);
                                                        setDeleteError(null);
                                                    }}
                                                    disabled={isSelf || isLastAdmin}
                                                    className={cn(
                                                        tableStyles.actionBtn,
                                                        'hover:text-red-600 hover:bg-red-50 hover:border-red-100'
                                                    )}
                                                    title={
                                                        isSelf
                                                            ? 'Cannot delete your own administrator account'
                                                            : isLastAdmin
                                                                ? 'Cannot delete the last remaining administrator'
                                                                : 'Delete user'
                                                    }
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* AdminPagination */}
                <AdminPagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={filteredUsers.length}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                />
            </div>

            {/* "Add User" Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/50">
                            <div>
                                <h2 className="text-base font-bold text-stone-900">Add New User</h2>
                                <p className="text-xs text-stone-500 mt-0.5">
                                    Create a new account with immediate verified login credentials.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                            {/* Error Banner */}
                            {addError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                                    <span>{addError}</span>
                                </div>
                            )}

                            {/* Name */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. John Doe"
                                    className="w-full border border-stone-200 rounded-lg px-3.5 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all font-medium shadow-2xs"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="user@schoolmart.in"
                                    className="w-full border border-stone-200 rounded-lg px-3.5 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all font-medium shadow-2xs"
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={generatePassword}
                                        className="text-xs font-medium text-[#1e3a8a] hover:underline flex items-center gap-1 transition-colors"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Generate Strong Password</span>
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        minLength={6}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Minimum 6 characters"
                                        className="w-full border border-stone-200 rounded-lg px-3.5 py-2 pr-10 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all font-mono shadow-2xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-[11px] text-stone-400">Must be at least 6 characters long.</p>
                            </div>

                            {/* Role Selection */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                                    Account Role
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'user' | 'admin' })}
                                    className="w-full border border-stone-200 rounded-lg px-3.5 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all bg-white font-medium cursor-pointer shadow-2xs"
                                >
                                    <option value="user">Standard User (Student / Faculty / Buyer)</option>
                                    <option value="admin">Administrator (Full Dashboard Privileges)</option>
                                </select>
                            </div>

                            {/* Phone (Optional) & Institution (Optional) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                                        Phone Number <span className="text-stone-400 font-normal text-[11px]">(Optional)</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+91 9876543210"
                                        className="w-full border border-stone-200 rounded-lg px-3.5 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all font-medium shadow-2xs"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">
                                        Institution <span className="text-stone-400 font-normal text-[11px]">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.institution}
                                        onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                                        placeholder="College / University"
                                        className="w-full border border-stone-200 rounded-lg px-3.5 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all font-medium shadow-2xs"
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-lg text-xs font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addLoading}
                                    className="px-4 py-2 bg-[#1e3a8a] hover:bg-[#172554] disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all shadow-2xs flex items-center gap-2"
                                >
                                    {addLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Create User</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* "Delete User" Confirmation Modal */}
            {deletingUser && (
                <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
                        <div className="p-6">
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center mb-4">
                                <Trash2 className="w-5 h-5" />
                            </div>

                            <h3 className="text-base font-bold text-stone-900">Delete User</h3>
                            <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                                Are you sure you want to delete{' '}
                                <strong className="text-stone-900">{deletingUser.name}</strong> ({deletingUser.email})?
                                This action cannot be undone.
                            </p>

                            <div className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                                All associated user data (saved addresses, wishlists, messages, and classifieds) will be
                                permanently cleaned up. Accounts with existing purchase orders cannot be deleted.
                            </div>

                            {currentUser?.id === deletingUser.id && (
                                <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                    <span>You cannot delete your own administrator account.</span>
                                </div>
                            )}

                            {deletingUser.role === 'admin' && adminCount <= 1 && (
                                <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                    <span>Cannot delete the last remaining administrator.</span>
                                </div>
                            )}

                            {deleteError && (
                                <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                    <span>{deleteError}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-stone-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDeletingUser(null);
                                        setDeleteError(null);
                                    }}
                                    disabled={deleteLoading}
                                    className="px-4 py-2 border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-lg text-xs font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteConfirm}
                                    disabled={deleteLoading || currentUser?.id === deletingUser.id || (deletingUser.role === 'admin' && adminCount <= 1)}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-all shadow-2xs flex items-center gap-2"
                                >
                                    {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Confirm Delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
