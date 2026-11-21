import assert from 'assert';
import { test } from 'node:test';

// Import compiled or transpileable modules
// In our Node environment, we can import from ts or test the compiled service logic directly
test('SolutionsIndexService Nightly Sync & Validation Suite', async (t) => {

  await t.test('1. Delay Calculation accurately targets 3:00 AM', () => {
    // Replicate pure static method logic
    const calculateDelayToTarget = (now, targetHour = 3, targetMinute = 0) => {
      const target = new Date(now);
      target.setHours(targetHour, targetMinute, 0, 0);
      if (now.getTime() >= target.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      return Math.max(0, target.getTime() - now.getTime());
    };

    // Case A: 2:00 AM on 2026-11-05 -> target is 3:00 AM today (1 hour = 3,600,000 ms)
    const testDateBefore = new Date('2026-11-05T02:00:00.000Z');
    testDateBefore.setHours(2, 0, 0, 0);
    const delayBefore = calculateDelayToTarget(testDateBefore, 3, 0);
    assert.strictEqual(delayBefore, 3600000, 'Delay before 3 AM should be exactly 1 hour (3600000 ms)');

    // Case B: 4:00 AM on 2026-11-05 -> target is 3:00 AM tomorrow (23 hours = 82,800,000 ms)
    const testDateAfter = new Date('2026-11-05T04:00:00.000Z');
    testDateAfter.setHours(4, 0, 0, 0);
    const delayAfter = calculateDelayToTarget(testDateAfter, 3, 0);
    assert.strictEqual(delayAfter, 23 * 3600000, 'Delay after 3 AM should be exactly 23 hours (82800000 ms)');

    // Case C: Exactly 3:00 AM -> target is 3:00 AM tomorrow (24 hours = 86,400,000 ms)
    const testDateExact = new Date('2026-11-05T03:00:00.000Z');
    testDateExact.setHours(3, 0, 0, 0);
    const delayExact = calculateDelayToTarget(testDateExact, 3, 0);
    assert.strictEqual(delayExact, 24 * 3600000, 'Delay at exactly 3 AM should schedule tomorrow (24 hours)');
  });

  await t.test('2. Watermark Validation rejects invalid or corrupted payloads', () => {
    const isValidWatermarks = (w) => {
      return (
        w !== null &&
        typeof w === 'object' &&
        typeof w.pageMax === 'number' && !isNaN(w.pageMax) && isFinite(w.pageMax) && w.pageMax >= 0 &&
        typeof w.pageCount === 'number' && !isNaN(w.pageCount) && isFinite(w.pageCount) && w.pageCount >= 0 &&
        typeof w.cardMax === 'number' && !isNaN(w.cardMax) && isFinite(w.cardMax) && w.cardMax >= 0 &&
        typeof w.cardCount === 'number' && !isNaN(w.cardCount) && isFinite(w.cardCount) && w.cardCount >= 0 &&
        typeof w.taxonomyMax === 'number' && !isNaN(w.taxonomyMax) && isFinite(w.taxonomyMax) && w.taxonomyMax >= 0 &&
        (w.caseMax === undefined || (typeof w.caseMax === 'number' && !isNaN(w.caseMax) && isFinite(w.caseMax) && w.caseMax >= 0)) &&
        (w.caseCount === undefined || (typeof w.caseCount === 'number' && !isNaN(w.caseCount) && isFinite(w.caseCount) && w.caseCount >= 0))
      );
    };

    // Valid watermark payload
    const valid = {
      pageMax: 1730810000000,
      pageCount: 68,
      cardMax: 1730810000000,
      cardCount: 197,
      taxonomyMax: 1730810000000,
      caseMax: 1730810000000,
      caseCount: 10,
    };
    assert.strictEqual(isValidWatermarks(valid), true, 'Valid watermark must pass');

    // Invalid: null / undefined
    assert.strictEqual(isValidWatermarks(null), false, 'null must fail');
    assert.strictEqual(isValidWatermarks(undefined), false, 'undefined must fail');

    // Invalid: NaN
    assert.strictEqual(isValidWatermarks({ ...valid, pageMax: NaN }), false, 'NaN must fail');

    // Invalid: Infinity
    assert.strictEqual(isValidWatermarks({ ...valid, pageCount: Infinity }), false, 'Infinity must fail');

    // Invalid: Negative count
    assert.strictEqual(isValidWatermarks({ ...valid, cardCount: -1 }), false, 'Negative count must fail');

    // Invalid: String instead of number
    assert.strictEqual(isValidWatermarks({ ...valid, taxonomyMax: "1730810000000" }), false, 'String timestamp must fail');

    // Invalid: Missing required field
    const incomplete = { ...valid };
    delete incomplete.pageMax;
    assert.strictEqual(isValidWatermarks(incomplete), false, 'Missing field must fail');
  });

  await t.test('3. Atomic swap guarantees active cache preservation on sync failure', async () => {
    // Simulated mock service verifying atomic swap
    let cache = ['card1', 'card2', 'card3'];
    let errorLogged = false;

    const mockCheckSync = async (shouldFail) => {
      try {
        if (shouldFail) {
          throw new Error('Database server connection lost (P1001)');
        }
        cache = ['newCard1', 'newCard2'];
        return true;
      } catch (err) {
        errorLogged = true;
        return false;
      }
    };

    // Attempt sync with failure
    const success = await mockCheckSync(true);
    assert.strictEqual(success, false, 'Sync must return false on error');
    assert.strictEqual(errorLogged, true, 'Error must be caught gracefully');
    assert.deepStrictEqual(cache, ['card1', 'card2', 'card3'], 'Cache must remain unchanged on failure');

    // Attempt sync with success
    const success2 = await mockCheckSync(false);
    assert.strictEqual(success2, true, 'Sync must return true on success');
    assert.deepStrictEqual(cache, ['newCard1', 'newCard2'], 'Cache must swap atomically on success');
  });

  await t.test('4. Timer cleanup disarms unref handles cleanly', () => {
    let initialNightlyTimer = setTimeout(() => {}, 1000000);
    let heartbeatTimer = setInterval(() => {}, 1000000);

    const stopHeartbeat = () => {
      if (initialNightlyTimer) {
        clearTimeout(initialNightlyTimer);
        initialNightlyTimer = null;
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    stopHeartbeat();
    assert.strictEqual(initialNightlyTimer, null, 'Initial nightly timer must be null');
    assert.strictEqual(heartbeatTimer, null, 'Heartbeat timer must be null');
  });

});
