import { queryClient } from './query-client';

export type CmsInvalidationPayload =
  | { type: 'INVALIDATE_PAGE'; slug: string }
  | { type: 'INVALIDATE_ALL'; slug?: string };

type InvalidationSubscriber = (payload: CmsInvalidationPayload) => void;
const subscribers = new Set<InvalidationSubscriber>();

export function subscribeCmsInvalidation(callback: InvalidationSubscriber): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

export function handleCmsInvalidation(payload: unknown) {
  if (!payload || typeof payload !== 'object') return;
  const p = payload as Record<string, unknown>;

  if (p.type === 'INVALIDATE_PAGE' && typeof p.slug === 'string') {
    const slug = p.slug;
    queryClient.invalidateQueries({ queryKey: ['page', slug] });
    queryClient.invalidateQueries({ queryKey: ['pageRecord', slug] });
    queryClient.invalidateQueries({ queryKey: ['hub', slug] });
    queryClient.invalidateQueries({ queryKey: ['hubItem', slug] });
    queryClient.invalidateQueries({ queryKey: ['resolve'] });
  } else if (p.type === 'INVALIDATE_ALL') {
    queryClient.invalidateQueries();
  }

  subscribers.forEach((cb) => {
    try {
      cb(payload as CmsInvalidationPayload);
    } catch (err) {
      console.warn('[cms-channel] Subscriber error:', err);
    }
  });
}

function getBroadcastChannelConstructor(): typeof BroadcastChannel | undefined {
  if (typeof window !== 'undefined' && window.BroadcastChannel) {
    return window.BroadcastChannel;
  }
  if (typeof BroadcastChannel !== 'undefined') {
    return BroadcastChannel;
  }
  return undefined;
}

let cmsBroadcastChannel: BroadcastChannel | null = null;

export function initCmsChannel(): BroadcastChannel | null {
  if (cmsBroadcastChannel) return cmsBroadcastChannel;
  const Ctor = getBroadcastChannelConstructor();
  if (Ctor) {
    try {
      cmsBroadcastChannel = new Ctor('cm_cms_channel');
      cmsBroadcastChannel.onmessage = (e) => {
        handleCmsInvalidation(e.data);
      };
    } catch (err) {
      console.warn('[cms-channel] Could not initialize BroadcastChannel:', err);
    }
  }
  return cmsBroadcastChannel;
}

export function closeCmsChannelForTesting() {
  if (cmsBroadcastChannel) {
    try {
      cmsBroadcastChannel.close();
    } catch {
      // ignore
    }
    cmsBroadcastChannel = null;
  }
}

// Initialise module-level singleton instance
initCmsChannel();

if (typeof window !== 'undefined') {
  try {
    window.addEventListener('cm_cms_channel', ((e: CustomEvent) => {
      handleCmsInvalidation(e.detail);
    }) as EventListener);
  } catch (err) {
    console.warn('[cms-channel] Could not initialize window listener:', err);
  }
}

export function broadcastCmsInvalidation(payload: CmsInvalidationPayload) {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('cm_cms_channel', { detail: payload }));
    } catch {
      handleCmsInvalidation(payload);
    }
  } else {
    handleCmsInvalidation(payload);
  }

  const channel = cmsBroadcastChannel || initCmsChannel();
  if (channel) {
    try {
      channel.postMessage(payload);
    } catch (err) {
      console.warn('[cms-channel] Broadcast postMessage error:', err);
    }
  }
}

export function getCmsBroadcastChannel(): BroadcastChannel | null {
  return cmsBroadcastChannel;
}
