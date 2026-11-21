import React, { createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { queryClient } from '@/lib/query-client';
import { subscribeCmsInvalidation } from '@/lib/cms-channel';

export interface SiteContentContextType {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: Record<string, any>;
    loading: boolean;
    refresh: () => Promise<void>;
}

const EMPTY_CONTENT = Object.freeze({});

const SiteContentContext = createContext<SiteContentContextType>({
    content: EMPTY_CONTENT,
    loading: true,
    refresh: async () => { },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchSiteContent(): Promise<Record<string, any>> {
    const { data } = await api.get('/content');

    // Parse JSON values only for structured objects and arrays, preserving strings like phone numbers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedContent: Record<string, any> = {};
    for (const key in data) {
        const val = data[key];
        if (typeof val === 'string' && (val.trim().startsWith('{') || val.trim().startsWith('['))) {
            try {
                parsedContent[key] = JSON.parse(val);
            } catch {
                parsedContent[key] = val;
            }
        } else {
            parsedContent[key] = val;
        }
    }
    return parsedContent;
}

export const SiteContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data, isPending } = useQuery({
        queryKey: ['siteContent'],
        queryFn: fetchSiteContent,
    });

    const refresh = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ['siteContent'] });
    }, []);

    // Subscribe to centralized CMS invalidation events
    useEffect(() => {
        const unsubscribe = subscribeCmsInvalidation((payload) => {
            if (payload.type === 'INVALIDATE_ALL') {
                refresh();
            }
        });
        return unsubscribe;
    }, [refresh]);

    const content = data ?? EMPTY_CONTENT;

    const value = useMemo(
        () => ({
            content,
            loading: isPending,
            refresh,
        }),
        [content, isPending, refresh]
    );

    return (
        <SiteContentContext.Provider value={value}>
            {children}
        </SiteContentContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSiteContent = () => useContext(SiteContentContext);
