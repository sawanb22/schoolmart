import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { isValidEmail } from '../lib/validation';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { RESUMES_DIR } from '../lib/uploads-dir';

const router = Router();


// GET /api/admin/stats
router.get('/stats', verifyToken, requireAdmin, async (_req: AuthRequest, res: Response) => {
    try {
        const [users, products, orders, enquiries, quotes, classifieds, revenue] = await Promise.all([
            prisma.user.count(),
            prisma.product.count({ where: { active: true } }),
            prisma.order.count(),
            prisma.contactEnquiry.count({ where: { read: false } }),
            prisma.quoteRequest.count({ where: { read: false } }),
            prisma.classified.count({ where: { status: 'pending' } }),
            prisma.order.aggregate({ _sum: { total: true } }),
        ]);
        res.json({
            users, products, orders, unreadEnquiries: enquiries, unreadQuotes: quotes,
            pendingClassifieds: classifieds, totalRevenue: revenue._sum.total || 0,
        });
    } catch {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// GET /api/admin/users
router.get('/users', verifyToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const safeLimit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, phone: true, institution: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: safeLimit,
        });
        res.json(users);
    } catch (error) {
        console.error('Failed to fetch users:', error);
        res.status(500).json({ error: 'An unexpected internal error occurred. Please try again later.' });
    }
});

// POST /api/admin/users - Admin creates new user
router.post('/users', verifyToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { name, email, password, role, phone, institution } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            res.status(400).json({ error: 'Name is required' });
            return;
        }

        if (!email || !isValidEmail(email)) {
            res.status(400).json({ error: 'Please enter a valid email address' });
            return;
        }

        if (!password || typeof password !== 'string' || password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check email uniqueness
        const existing = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existing) {
            res.status(409).json({ error: 'User with this email already exists' });
            return;
        }

        const assignedRole = role === 'admin' ? 'admin' : 'user';
        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                passwordHash,
                role: assignedRole,
                phone: phone ? String(phone).trim() : null,
                institution: institution ? String(institution).trim() : null,
                emailVerified: true,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                institution: true,
                createdAt: true,
            },
        });

        res.status(201).json(user);
    } catch (error) {
        console.error('Failed to create user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT /api/admin/users/:id/role - Promote or demote user role
router.put('/users/:id/role', verifyToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const userId = Number(req.params.id);
        const { role } = req.body;
        
        // Validate role
        if (!role || !['user', 'admin'].includes(role)) {
            res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
            return;
        }
        
        // Check user exists
        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        if (!userExists) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Prevent self-demotion
        if (req.user?.id === userId && role !== 'admin') {
            res.status(400).json({ error: 'You cannot demote your own administrator account' });
            return;
        }

        // Prevent demoting the last remaining administrator
        if (role !== 'admin' && userExists.role === 'admin') {
            const adminCount = await prisma.user.count({ where: { role: 'admin' } });
            if (adminCount <= 1) {
                res.status(400).json({ error: 'Cannot demote the last remaining administrator' });
                return;
            }
        }
        
        const user = await prisma.user.update({ 
            where: { id: userId }, 
            data: { role } 
        });
        console.log(`User ${userId} role changed to ${role} by admin ${req.user?.id}`);
        res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (error) {
        console.error('Failed to update user role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

// DELETE /api/admin/users/:id - Delete a user and associated data
router.delete('/users/:id', verifyToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const userId = Number(req.params.id);
        if (isNaN(userId)) {
            res.status(400).json({ error: 'Invalid user ID' });
            return;
        }

        // Prevent self-deletion
        if (req.user?.id === userId) {
            res.status(400).json({ error: 'You cannot delete your own administrator account' });
            return;
        }

        // Find user
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // If user is admin, verify admin count > 1
        if (user.role === 'admin') {
            const adminCount = await prisma.user.count({ where: { role: 'admin' } });
            if (adminCount <= 1) {
                res.status(400).json({ error: 'Cannot delete the last remaining administrator' });
                return;
            }
        }

        // Check if user has purchase orders
        const orderCount = await prisma.order.count({ where: { userId } });
        if (orderCount > 0) {
            res.status(400).json({ error: 'Cannot delete user with existing purchase orders' });
            return;
        }

        // Transactional cleanup with prisma.$transaction
        await prisma.$transaction([
            prisma.wishlistItem.deleteMany({ where: { userId } }),
            prisma.address.deleteMany({ where: { userId } }),
            prisma.chatMessage.deleteMany({ where: { userId } }),
            prisma.classified.deleteMany({ where: { userId } }),
            prisma.user.delete({ where: { id: userId } }),
        ]);

        res.json({ success: true, message: 'User deleted successfully', id: userId });
    } catch (error) {
        console.error('Failed to delete user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// GET /api/admin/enquiries
router.get('/enquiries', verifyToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const safeLimit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
        const [contacts, quotes] = await Promise.all([
            prisma.contactEnquiry.findMany({ orderBy: { createdAt: 'desc' }, take: safeLimit }),
            prisma.quoteRequest.findMany({ orderBy: { createdAt: 'desc' }, take: safeLimit }),
        ]);
        res.json({ contacts, quotes });
    } catch (error) {
        console.error('Failed to fetch enquiries:', error);
        res.status(500).json({ error: 'An unexpected internal error occurred. Please try again later.' });
    }
});

// GET /api/admin/enquiries/contact/:id/resume
router.get('/enquiries/contact/:id/resume', verifyToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const enquiry = await prisma.contactEnquiry.findUnique({ where: { id: Number(req.params.id) } });
        if (!enquiry?.resumeFilename) {
            res.status(404).json({ error: 'Resume not found' });
            return;
        }
        const filePath = path.resolve(RESUMES_DIR, enquiry.resumeFilename);
        if (!filePath.startsWith(`${path.resolve(RESUMES_DIR)}${path.sep}`) || !fs.existsSync(filePath)) {
            res.status(404).json({ error: 'Resume file not found' });
            return;
        }
        res.download(filePath, enquiry.resumeOriginalName || enquiry.resumeFilename);
    } catch {
        res.status(500).json({ error: 'Failed to download resume' });
    }
});

// PUT /api/admin/enquiries/contact/:id/read
router.put('/enquiries/contact/:id/read', verifyToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        await prisma.contactEnquiry.update({ where: { id: Number(req.params.id) }, data: { read: true } });
        res.json({ message: 'Marked as read' });
    } catch {
        res.status(500).json({ error: 'Failed to update enquiry' });
    }
});

// PUT /api/admin/enquiries/quote/:id/read
router.put('/enquiries/quote/:id/read', verifyToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        await prisma.quoteRequest.update({ where: { id: Number(req.params.id) }, data: { read: true } });
        res.json({ message: 'Marked as read' });
    } catch {
        res.status(500).json({ error: 'Failed to update quote' });
    }
});

// GET /api/admin/wishlist-report - every wishlist item with the owning user's
// contact details, for the sales team to follow up on and prepare quotations.
router.get('/wishlist-report', verifyToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const safeLimit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
        const items = await prisma.wishlistItem.findMany({
            include: {
                user: { select: { id: true, name: true, email: true, phone: true, institution: true } },
                product: { include: { category: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: safeLimit,
        });
        res.json(items);
    } catch (error) {
        console.error('Failed to fetch wishlist report:', error);
        res.status(500).json({ error: 'An unexpected internal error occurred. Please try again later.' });
    }
});

const escapeCsvValue = (value: string) => {
    const str = String(value ?? '');
    const sanitized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
    return `"${sanitized.replace(/"/g, '""')}"`;
};

// GET /api/admin/wishlist-report/export - downloadable CSV file with optional userId filter and clean user separators.
router.get('/wishlist-report/export', verifyToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const userIdQuery = req.query.userId ? Number(req.query.userId) : null;
        const whereClause = userIdQuery && Number.isInteger(userIdQuery) ? { userId: userIdQuery } : {};
        const safeLimit = Math.min(Math.max(Number(req.query.limit) || 1000, 1), 5000);

        const items = await prisma.wishlistItem.findMany({
            where: whereClause,
            include: {
                user: { select: { id: true, name: true, email: true, phone: true, institution: true } },
                product: { include: { category: true } },
            },
            orderBy: [
                { userId: 'asc' },
                { createdAt: 'desc' },
            ],
            take: safeLimit,
        });

        const header = ['User Name', 'Email', 'Phone', 'Institution', 'Item', 'Category', 'Units / Qty', 'Date Added'];
        const rows: string[] = [];
        let lastUserId: number | null = null;

        for (const item of items) {
            // Option A: If switching to a new user in a multi-user report, insert a clean blank row separator
            if (lastUserId !== null && item.user.id !== lastUserId) {
                rows.push(['', '', '', '', '', '', '', ''].map(escapeCsvValue).join(','));
            }
            lastUserId = item.user.id;

            const itemName = item.product?.name ?? item.designTitle ?? '';
            const category = item.product?.category?.name ?? item.pageSlug ?? '';
            const dateStr = item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : '';

            rows.push([
                item.user.name,
                item.user.email,
                item.user.phone ?? '',
                item.user.institution ?? '',
                itemName,
                category,
                item.quantity || 1,
                dateStr,
            ]
                .map((value) => escapeCsvValue(String(value)))
                .join(','));
        }

        const csv = [header.map(escapeCsvValue).join(','), ...rows].join('\n');

        const safeFilename = userIdQuery && items.length > 0
            ? `wishlist-${items[0].user.name.replace(/[^a-zA-Z0-9_-]/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`
            : `wishlist-report-${new Date().toISOString().slice(0, 10)}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.send(csv);
    } catch (error) {
        console.error('Failed to export wishlist report:', error);
        res.status(500).json({ error: 'Failed to export wishlist report' });
    }
});

export default router;
