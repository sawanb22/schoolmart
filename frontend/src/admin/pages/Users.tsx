import { useEffect, useMemo, useState } from 'react';
import {
    Users as UsersIcon,
    ShieldCheck,
    UserCheck,
    Plus,
    Search,
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

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    phone?: string;
    institution?: string;
    createdAt: string;
}

interface NewUserForm {
    name: string;
    email: string;
    password: string;
    role: 'user' | 'admin';
    phone: string;
    institution: string;
}

const INITIAL_FORM: NewUserForm = {
    name: '',
    email: '',
    password: '',
    role: 'user',
    phone: '',
    institution: '',
};

export default function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);

    // Filter and search state
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');

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
            setUsers(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error('Failed to fetch users:', err);
            setPageError(err.response?.data?.error || 'Failed to fetch users');
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

    // Role update handler
    const updateRole = async (id: number, role: string) => {
        setRoleUpdatingId(id);
        setPageError(null);
        try {
            await api.put(`/admin/users/${id}/role`, { role });
            setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
        } catch (err: any) {
            console.error('Failed to update role:', err);
            const msg = err.response?.data?.error || 'Failed to update user role';
            setPageError(msg);
        } finally {
            setRoleUpdatingId(null);
        }
    };

    // Generate random strong password
    const generatePassword = () => {
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        const numbers = '23456789';
        const symbols = '!@#$%&*';
        const all = letters + numbers + symbols;

        let pass = '';
        pass += letters.charAt(Math.floor(Math.random() * letters.length));
        pass += numbers.charAt(Math.floor(Math.random() * numbers.length));
        pass += symbols.charAt(Math.floor(Math.random() * symbols.length));

        for (let i = 3; i < 10; i++) {
            pass += all.charAt(Math.floor(Math.random() * all.length));
        }

        // Shuffle
        pass = pass.split('').sort(() => 0.5 - Math.random()).join('');

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
    const handleAddSubmit = async (e: React.FormEvent) => {
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
        } catch (err: any) {
            console.error('Failed to create user:', err);
            setAddError(err.response?.data?.error || 'Failed to create user. Please check your inputs.');
        } finally {
            setAddLoading(false);
        }
    };

    // Confirm Delete User
    const handleDeleteConfirm = async () => {
        if (!deletingUser) return;
        setDeleteError(null);
        setDeleteLoading(true);

        try {
            await api.delete(`/admin/users/${deletingUser.id}`);
            setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
            setDeletingUser(null);
        } catch (err: any) {
            console.error('Failed to delete user:', err);
            setDeleteError(err.response?.data?.error || 'Failed to delete user');
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header & Metric Pills */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <span>Users</span>
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Manage platform accounts, administrator roles, and access control.
                    </p>
                </div>

                <button
                    onClick={openAddModal}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all hover:shadow active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    <span>+ Add New User</span>
                </button>
            </div>

            {/* Metric Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <UsersIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Users</div>
                        <div className="text-2xl font-bold text-gray-900 mt-0.5">{totalUsersCount}</div>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Administrators</div>
                        <div className="text-2xl font-bold text-indigo-600 mt-0.5">{adminCount}</div>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-xs">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Standard Users</div>
                        <div className="text-2xl font-bold text-emerald-600 mt-0.5">{standardUserCount}</div>
                    </div>
                </div>
            </div>

            {/* Global Error Banner */}
            {pageError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                        <span>{pageError}</span>
                    </div>
                    <button
                        onClick={() => setPageError(null)}
                        className="text-red-400 hover:text-red-600 text-xs font-semibold uppercase tracking-wider ml-4"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Filter & Live Search Toolbar */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
                {/* Search Bar */}
                <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, email, or institution..."
                        className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            title="Clear search"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Role Tabs */}
                <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <button
                        onClick={() => setRoleFilter('all')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            roleFilter === 'all'
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        All ({totalUsersCount})
                    </button>
                    <button
                        onClick={() => setRoleFilter('admin')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            roleFilter === 'admin'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Admins ({adminCount})
                    </button>
                    <button
                        onClick={() => setRoleFilter('user')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            roleFilter === 'user'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Standard ({standardUserCount})
                    </button>
                </div>
            </div>

            {/* Users Table Card */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wider font-semibold">
                            <tr>
                                <th className="px-5 py-3.5">User</th>
                                <th className="px-4 py-3.5">Contact</th>
                                <th className="px-4 py-3.5">Institution</th>
                                <th className="px-4 py-3.5">Role</th>
                                <th className="px-4 py-3.5">Joined</th>
                                <th className="px-4 py-3.5">Manage Role</th>
                                <th className="px-4 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                            <span className="text-sm">Loading users...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                                            <UsersIcon className="w-8 h-8 text-gray-300" />
                                            <p className="font-semibold text-gray-700">No users found</p>
                                            <p className="text-xs text-gray-400">
                                                {search
                                                    ? `No users match "${search}". Try adjusting your search query.`
                                                    : 'No users registered yet.'}
                                            </p>
                                            {search && (
                                                <button
                                                    onClick={() => setSearch('')}
                                                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                                                >
                                                    Clear filter
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => {
                                    const isSelf = currentUser?.id === u.id;
                                    return (
                                        <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                                            {/* User Name & Email */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm shrink-0 uppercase">
                                                        {u.name.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                                                            <span>{u.name}</span>
                                                            {isSelf && (
                                                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-blue-50 text-blue-600 rounded border border-blue-200">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                            <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                                                            <span>{u.email}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Phone */}
                                            <td className="px-4 py-3.5 text-gray-600 text-xs">
                                                {u.phone ? (
                                                    <span className="inline-flex items-center gap-1 text-gray-700">
                                                        <Phone className="w-3 h-3 text-gray-400" />
                                                        {u.phone}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>

                                            {/* Institution */}
                                            <td className="px-4 py-3.5 text-gray-600 text-xs">
                                                {u.institution ? (
                                                    <span className="inline-flex items-center gap-1 text-gray-700 max-w-xs truncate" title={u.institution}>
                                                        <Building2 className="w-3 h-3 text-gray-400 shrink-0" />
                                                        <span className="truncate">{u.institution}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>

                                            {/* Role Badge */}
                                            <td className="px-4 py-3.5">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                        u.role === 'admin'
                                                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    }`}
                                                >
                                                    {u.role === 'admin' ? (
                                                        <ShieldCheck className="w-3 h-3" />
                                                    ) : (
                                                        <UserCheck className="w-3 h-3" />
                                                    )}
                                                    <span className="capitalize">{u.role}</span>
                                                </span>
                                            </td>

                                            {/* Joined Date */}
                                            <td className="px-4 py-3.5 text-gray-500 text-xs">
                                                <span className="inline-flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-gray-400" />
                                                    {new Date(u.createdAt).toLocaleDateString('en-IN', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </span>
                                            </td>

                                            {/* Manage Role Dropdown */}
                                            <td className="px-4 py-3.5">
                                                <div className="relative inline-block">
                                                    <select
                                                        value={u.role}
                                                        disabled={roleUpdatingId === u.id}
                                                        onChange={(e) => updateRole(u.id, e.target.value)}
                                                        className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-medium bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        <option value="user">User</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                    {roleUpdatingId === u.id && (
                                                        <Loader2 className="w-3 h-3 animate-spin text-blue-600 absolute -right-4 top-2" />
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions: Delete Button */}
                                            <td className="px-4 py-3.5 text-right">
                                                <button
                                                    onClick={() => {
                                                        setDeletingUser(u);
                                                        setDeleteError(null);
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title={isSelf ? 'Cannot delete your own administrator account' : 'Delete user'}
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
            </div>

            {/* "Add User" Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Add New User</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Create a new account with immediate verified login credentials.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
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
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. John Doe"
                                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="user@schoolmart.in"
                                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={generatePassword}
                                        className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
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
                                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-[11px] text-gray-400">Must be at least 6 characters long.</p>
                            </div>

                            {/* Role Selection */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                                    Account Role
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'user' | 'admin' })}
                                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white font-medium cursor-pointer"
                                >
                                    <option value="user">Standard User (Student / Faculty / Buyer)</option>
                                    <option value="admin">Administrator (Full Dashboard Privileges)</option>
                                </select>
                            </div>

                            {/* Phone (Optional) & Institution (Optional) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                                        Phone Number <span className="text-gray-400 font-normal text-[11px]">(Optional)</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+91 9876543210"
                                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                                        Institution <span className="text-gray-400 font-normal text-[11px]">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.institution}
                                        onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                                        placeholder="College / University"
                                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addLoading}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2"
                                >
                                    {addLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>Create User</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* "Delete User" Confirmation Modal */}
            {deletingUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
                                <Trash2 className="w-6 h-6" />
                            </div>

                            <h3 className="text-lg font-bold text-gray-900">Delete User</h3>
                            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                                Are you sure you want to delete{' '}
                                <strong className="text-gray-900">{deletingUser.name}</strong> ({deletingUser.email})?
                                This action cannot be undone.
                            </p>

                            <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                                All associated user data (saved addresses, wishlists, messages, and classifieds) will be
                                permanently cleaned up. Accounts with existing purchase orders cannot be deleted.
                            </div>

                            {currentUser?.id === deletingUser.id && (
                                <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                    <span>You cannot delete your own administrator account.</span>
                                </div>
                            )}

                            {deleteError && (
                                <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                    <span>{deleteError}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDeletingUser(null);
                                        setDeleteError(null);
                                    }}
                                    disabled={deleteLoading}
                                    className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteConfirm}
                                    disabled={deleteLoading || currentUser?.id === deletingUser.id}
                                    className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2"
                                >
                                    {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
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
