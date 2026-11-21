/**
 * Legacy serialization adapter for Page responses.
 * Reconstructs pageData as string | null so existing frontend contracts
 * remain 100% unbroken.
 */

export function toLegacyPageResponse<T extends { pageData: any }>(
    page: T
): Omit<T, 'pageData'> & { pageData: string | null } {
    if (page == null) {
        return page as any;
    }

    let serialized: string | null = null;
    if (page.pageData !== null && page.pageData !== undefined) {
        if (typeof page.pageData === 'string') {
            serialized = page.pageData;
        } else {
            serialized = JSON.stringify(page.pageData);
        }
    }

    const { items, categories, revisions, ...rest } = page as any;
    return {
        ...rest,
        pageData: serialized,
    };
}

export function toLegacyPagesResponse<T extends { pageData: any }>(
    pages: T[]
): (Omit<T, 'pageData'> & { pageData: string | null })[] {
    return pages.map((p) => toLegacyPageResponse(p));
}
