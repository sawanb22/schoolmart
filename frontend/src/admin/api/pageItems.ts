import api from './client';

export interface ItemSummary {
    id: number;
    slug: string;
    collection: string;
    title: string;
    summary: string | null;
    imageUrl: string | null;
    href: string | null;
    badge: string | null;
    categories: string[];
    data: Record<string, any>;
    sortOrder: number;
}

export interface ItemFull extends ItemSummary {
    detail: Record<string, any>;
    published: boolean;
    version: number;
    updatedAt: string;
    card?: Record<string, any>;
}

export interface PageCategory {
    id: number;
    name: string;
    slug: string;
    sortOrder: number;
    itemCount?: number;
}

export interface CreateItemPayload {
    collection: string;
    card?: Record<string, any>;
    title?: string;
    slug?: string;
    summary?: string | null;
    imageUrl?: string | null;
    href?: string | null;
    badge?: string | null;
    data?: Record<string, any>;
    detail?: Record<string, any>;
    categories?: string[];
    published?: boolean;
    position?: number;
}

export interface UpdateItemPayload {
    version: number;
    card?: Record<string, any>;
    title?: string;
    slug?: string;
    summary?: string | null;
    imageUrl?: string | null;
    href?: string | null;
    badge?: string | null;
    data?: Record<string, any>;
    detail?: Record<string, any>;
    categories?: string[];
    published?: boolean;
    collection?: string;
    position?: number;
}

/**
 * GET /api/admin/pages/:pageId/items?collection=&format=card
 */
export async function fetchAdminPageItems(
    pageId: number,
    collection?: string,
    format: 'summary' | 'card' = 'card'
): Promise<{ items: (ItemFull & { card?: any })[] }> {
    const params: Record<string, string> = { format };
    if (collection) params.collection = collection;
    const { data } = await api.get(`/admin/pages/${pageId}/items`, { params });
    return data;
}

/**
 * POST /api/admin/pages/:pageId/items
 */
export async function createAdminPageItem(
    pageId: number,
    payload: CreateItemPayload
): Promise<ItemFull & { card?: any }> {
    const { data } = await api.post(`/admin/pages/${pageId}/items`, payload);
    return data;
}

/**
 * PATCH /api/admin/pages/:pageId/items/:itemId
 */
export async function updateAdminPageItem(
    pageId: number,
    itemId: number,
    payload: UpdateItemPayload
): Promise<ItemFull & { card?: any }> {
    const { data } = await api.patch(`/admin/pages/${pageId}/items/${itemId}`, payload);
    return data;
}

/**
 * DELETE /api/admin/pages/:pageId/items/:itemId?version=N
 */
export async function deleteAdminPageItem(
    pageId: number,
    itemId: number,
    version?: number
): Promise<void> {
    const params: Record<string, string | number> = {};
    if (version !== undefined) params.version = version;
    await api.delete(`/admin/pages/${pageId}/items/${itemId}`, { params });
}

/**
 * PUT /api/admin/pages/:pageId/items/reorder
 */
export async function reorderAdminPageItems(
    pageId: number,
    collection: string | undefined,
    orderedIds: number[]
): Promise<{ items: ItemFull[] }> {
    const { data } = await api.put(`/admin/pages/${pageId}/items/reorder`, {
        collection,
        orderedIds,
    });
    return data;
}

/**
 * GET /api/admin/pages/:pageId/categories
 */
export async function fetchAdminPageCategories(
    pageId: number
): Promise<{ categories: PageCategory[] }> {
    const { data } = await api.get(`/admin/pages/${pageId}/categories`);
    return data;
}

/**
 * POST /api/admin/pages/:pageId/categories
 */
export async function createAdminPageCategory(
    pageId: number,
    name: string
): Promise<{ category: PageCategory }> {
    const { data } = await api.post(`/admin/pages/${pageId}/categories`, { name });
    return data;
}

/**
 * PATCH /api/admin/pages/:pageId/categories/:id
 */
export async function updateAdminPageCategory(
    pageId: number,
    categoryId: number,
    payload: { name?: string; sortOrder?: number }
): Promise<{ category: PageCategory }> {
    const { data } = await api.patch(`/admin/pages/${pageId}/categories/${categoryId}`, payload);
    return data;
}

/**
 * DELETE /api/admin/pages/:pageId/categories/:id
 */
export async function deleteAdminPageCategory(
    pageId: number,
    categoryId: number
): Promise<void> {
    await api.delete(`/admin/pages/${pageId}/categories/${categoryId}`);
}

/**
 * PUT /api/admin/pages/:pageId/categories/reorder
 */
export async function reorderAdminPageCategories(
    pageId: number,
    orderedIds: number[]
): Promise<{ categories: PageCategory[] }> {
    const { data } = await api.put(`/admin/pages/${pageId}/categories/reorder`, {
        orderedIds,
    });
    return data;
}

// ==========================================
// Revisions & Restore (T13)
// ==========================================

export interface PageRevision {
    id: number;
    version: number;
    reason: string;
    authorId: number | null;
    createdAt: string;
}

/**
 * GET /api/admin/pages/:pageId/revisions
 */
export async function fetchAdminPageRevisions(
    pageId: number
): Promise<{ revisions: PageRevision[] }> {
    const { data } = await api.get(`/admin/pages/${pageId}/revisions`);
    return data;
}

/**
 * POST /api/admin/pages/:pageId/revisions/:revId/restore
 */
export async function restoreAdminPageRevision(
    pageId: number,
    revId: number,
    version: number
): Promise<{ page: any; restoredRevisionId: number }> {
    const { data } = await api.post(`/admin/pages/${pageId}/revisions/${revId}/restore`, {
        version,
    });
    return data;
}
