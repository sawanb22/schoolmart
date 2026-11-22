import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryClient } from './query-client';
import {
  broadcastCmsInvalidation,
  handleCmsInvalidation,
  subscribeCmsInvalidation,
  getCmsBroadcastChannel,
} from './cms-channel';

describe('Centralized CMS Channel (cms-channel.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('maintains a single module-level BroadcastChannel singleton instance', () => {
    const channel1 = getCmsBroadcastChannel();
    expect(channel1).not.toBeNull();
    expect(channel1?.name).toBe('cm_cms_channel');

    // Subsequent calls or invalidation broadcasts reuse the identical channel instance
    broadcastCmsInvalidation({ type: 'INVALIDATE_PAGE', slug: 'test-slug' });
    const channel2 = getCmsBroadcastChannel();

    expect(channel1).toBe(channel2);
  });

  it('delivers invalidation events to queryClient and active subscribers', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const subscriberEvents: unknown[] = [];

    const unsubscribe = subscribeCmsInvalidation((payload) => {
      subscriberEvents.push(payload);
    });

    // Test INVALIDATE_PAGE
    handleCmsInvalidation({ type: 'INVALIDATE_PAGE', slug: 'math-lab' });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['page', 'math-lab'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['pageRecord', 'math-lab'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['hub', 'math-lab'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['hubItem', 'math-lab'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['resolve'] });

    expect(subscriberEvents).toHaveLength(1);
    expect(subscriberEvents[0]).toEqual({ type: 'INVALIDATE_PAGE', slug: 'math-lab' });

    // Test INVALIDATE_ALL
    invalidateSpy.mockClear();
    handleCmsInvalidation({ type: 'INVALIDATE_ALL' });

    expect(invalidateSpy).toHaveBeenCalledWith();
    expect(subscriberEvents).toHaveLength(2);
    expect(subscriberEvents[1]).toEqual({ type: 'INVALIDATE_ALL' });

    unsubscribe();
  });

  it('broadcastCmsInvalidation dispatches window CustomEvent and notifies subscribers', () => {
    const receivedDetails: unknown[] = [];
    const onCustomEvent = (e: Event) => {
      receivedDetails.push((e as CustomEvent).detail);
    };

    window.addEventListener('cm_cms_channel', onCustomEvent);

    broadcastCmsInvalidation({ type: 'INVALIDATE_PAGE', slug: 'physics-lab' });

    expect(receivedDetails).toContainEqual({
      type: 'INVALIDATE_PAGE',
      slug: 'physics-lab',
    });

    window.removeEventListener('cm_cms_channel', onCustomEvent);
  });
});
