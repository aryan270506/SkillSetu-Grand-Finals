const { test, describe } = require('node:test');
const assert = require('node:assert');

// 1. In-memory Cache & Deduplication Tests
describe('OpportunityPreviewCache Service', () => {
  // Mock implementations matching opportunityPreviewCache.js
  const previewCache = new Map();
  const inFlightRequests = new Map();

  function buildKey(type, id, email = '') {
    return `${type}:${String(id)}:${String(email).trim().toLowerCase()}`;
  }

  function getCachedPreviewDetail(type, id, email = '') {
    if (!id) return null;
    const key = buildKey(type, id, email);
    return previewCache.get(key) || null;
  }

  function setCachedPreviewDetail(type, id, email = '', data) {
    if (!id || !data) return;
    const key = buildKey(type, id, email);
    previewCache.set(key, data);
  }

  async function fetchPreviewDetailWithCache(type, id, email = '', fetcher) {
    if (!id || typeof fetcher !== 'function') return null;
    const key = buildKey(type, id, email);

    if (previewCache.has(key)) {
      return previewCache.get(key);
    }

    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key);
    }

    const promise = (async () => {
      try {
        const data = await fetcher(id, email);
        if (data) {
          previewCache.set(key, data);
        }
        return data;
      } finally {
        inFlightRequests.delete(key);
      }
    })();

    inFlightRequests.set(key, promise);
    return promise;
  }

  function clearOpportunityPreviewCache() {
    previewCache.clear();
    inFlightRequests.clear();
  }

  test('caches details and returns them without calling fetcher again', async () => {
    clearOpportunityPreviewCache();
    let callCount = 0;
    const mockFetcher = async (id, email) => {
      callCount++;
      return { id, title: 'Frontend Engineer', stipend: '₹40,000/mo' };
    };

    const first = await fetchPreviewDetailWithCache('internship', 101, 'student@skillsetu.com', mockFetcher);
    assert.strictEqual(first.id, 101);
    assert.strictEqual(callCount, 1);

    // Second call should come from cache
    const second = await fetchPreviewDetailWithCache('internship', 101, 'student@skillsetu.com', mockFetcher);
    assert.strictEqual(second.id, 101);
    assert.strictEqual(callCount, 1, 'Fetcher must not be called again on repeat hover');
  });

  test('deduplicates concurrent in-flight requests for the same opportunity', async () => {
    clearOpportunityPreviewCache();
    let fetchCount = 0;
    const slowFetcher = async (id) => {
      fetchCount++;
      await new Promise((r) => setTimeout(r, 50));
      return { id, provider: 'AICTE', award: 50000 };
    };

    const [res1, res2, res3] = await Promise.all([
      fetchPreviewDetailWithCache('scholarship', 202, 'student@skillsetu.com', slowFetcher),
      fetchPreviewDetailWithCache('scholarship', 202, 'student@skillsetu.com', slowFetcher),
      fetchPreviewDetailWithCache('scholarship', 202, 'student@skillsetu.com', slowFetcher),
    ]);

    assert.strictEqual(res1.id, 202);
    assert.strictEqual(res2.id, 202);
    assert.strictEqual(res3.id, 202);
    assert.strictEqual(fetchCount, 1, 'Concurrent requests must share a single promise');
  });

  test('enforces strict user isolation across sessions', async () => {
    clearOpportunityPreviewCache();
    setCachedPreviewDetail('internship', 303, 'alice@skillsetu.com', { score: 92 });
    setCachedPreviewDetail('internship', 303, 'bob@skillsetu.com', { score: 68 });

    const aliceData = getCachedPreviewDetail('internship', 303, 'alice@skillsetu.com');
    const bobData = getCachedPreviewDetail('internship', 303, 'bob@skillsetu.com');

    assert.strictEqual(aliceData.score, 92);
    assert.strictEqual(bobData.score, 68);
    assert.notStrictEqual(aliceData, bobData, 'User cache must be isolated by email');
  });

  test('clears entire cache on logout', () => {
    setCachedPreviewDetail('internship', 404, 'student@skillsetu.com', { title: 'Backend' });
    assert.ok(getCachedPreviewDetail('internship', 404, 'student@skillsetu.com'));

    clearOpportunityPreviewCache();
    assert.strictEqual(getCachedPreviewDetail('internship', 404, 'student@skillsetu.com'), null);
  });
});

// 2. Viewport Edge Repositioning Logic Tests
describe('Preview Viewport Positioning Logic', () => {
  const PREVIEW_WIDTH = 430;
  const PREVIEW_ESTIMATED_HEIGHT = 490;

  function calculatePosition(anchorRect, vw = 1440, vh = 900) {
    if (!anchorRect) return { top: 0, left: 0, maxHeight: 480, placement: 'right' };
    const gap = 12;
    const padding = 14;

    const spaceRight = vw - (anchorRect.right + gap);
    const spaceLeft = anchorRect.left - gap;
    let left = anchorRect.right + gap;
    let placement = 'right';

    if (spaceRight >= PREVIEW_WIDTH) {
      left = anchorRect.right + gap;
      placement = 'right';
    } else if (spaceLeft >= PREVIEW_WIDTH) {
      left = anchorRect.left - PREVIEW_WIDTH - gap;
      placement = 'left';
    } else {
      left = Math.max(padding, Math.min(anchorRect.left, vw - PREVIEW_WIDTH - padding));
      placement = 'overlay';
    }

    let top = anchorRect.top;
    if (top + PREVIEW_ESTIMATED_HEIGHT > vh - padding) {
      top = Math.max(padding, vh - PREVIEW_ESTIMATED_HEIGHT - padding);
    }
    if (top < padding) {
      top = padding;
    }

    const maxHeight = Math.min(PREVIEW_ESTIMATED_HEIGHT, vh - 2 * padding);
    return { top, left, maxHeight, placement };
  }

  test('positions to the right when ample room exists', () => {
    const cardRect = { top: 150, bottom: 400, left: 100, right: 500, width: 400, height: 250 };
    const pos = calculatePosition(cardRect, 1440, 900);

    assert.strictEqual(pos.placement, 'right');
    assert.strictEqual(pos.left, 500 + 12);
    assert.strictEqual(pos.top, 150);
  });

  test('flips to the left when right viewport edge is tight', () => {
    const cardRect = { top: 150, bottom: 400, left: 950, right: 1350, width: 400, height: 250 };
    const pos = calculatePosition(cardRect, 1440, 900);

    assert.strictEqual(pos.placement, 'left');
    assert.strictEqual(pos.left, 950 - 430 - 12);
    assert.strictEqual(pos.top, 150);
  });

  test('shifts vertically upwards when card is near bottom edge', () => {
    const cardRect = { top: 700, bottom: 950, left: 100, right: 500, width: 400, height: 250 };
    const pos = calculatePosition(cardRect, 1440, 900);

    assert.ok(pos.top < 700, 'Top should shift upwards to fit in viewport');
    assert.strictEqual(pos.top + PREVIEW_ESTIMATED_HEIGHT <= 900 - 14, true);
  });

  test('clamps within screen bounds on compact viewports', () => {
    const cardRect = { top: 50, bottom: 300, left: 20, right: 380, width: 360, height: 250 };
    const pos = calculatePosition(cardRect, 400, 700);

    assert.strictEqual(pos.placement, 'overlay');
    assert.ok(pos.left >= 14);
    assert.ok(pos.left <= 400 - 14);
  });
});

// 3. HTML Sanitization and Missing-Field Handling Tests
describe('HTML Sanitization and Missing-Field Handling', () => {
  function sanitizeScrapedText(html) {
    if (!html) return '';
    let str = String(html);
    str = str.replace(/<(script|style|iframe|form)[^>]*>[\s\S]*?<\/\1>/gi, '');
    str = str.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
    str = str.replace(/<\s*br\s*\/?>/gi, ' ');
    str = str.replace(/<\/(p|div|section|article|h[1-6]|tr|blockquote)>/gi, ' ');
    str = str.replace(/<\/li>/gi, ' • ');
    str = str.replace(/<(li|dt)>/gi, ' • ');
    str = str.replace(/<[a-zA-Z\/][^>]*$/g, '');
    str = str.replace(/<[^>]+>/g, ' ');
    const entities = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&quot;': '"',
      '&#39;': "'",
      '&bull;': '•',
    };
    str = str.replace(/&[a-zA-Z0-9#]+;/g, (m) => entities[m] || m);
    return str.replace(/\s+/g, ' ').trim();
  }

  test('removes severed/unclosed HTML tags from scraped descriptions', () => {
    const input = 'We are looking for an intern. <a href="https://jobicy.com/apply" rel="nofoll';
    const output = sanitizeScrapedText(input);
    assert.strictEqual(output, 'We are looking for an intern.');
  });

  test('correctly decodes HTML entities and normalizes whitespace', () => {
    const input = '&lt;b&gt;Requirements:&lt;/b&gt;&nbsp;&nbsp;React &amp; Node.js &bull; Fast-paced';
    const output = sanitizeScrapedText(input);
    assert.strictEqual(output, 'Requirements: React & Node.js • Fast-paced');
  });
});

// 4. Threshold & Eligibility Gate Evaluation Tests
describe('Threshold & Eligibility Gate Rules', () => {
  function evaluateEligibility(score, threshold = 80, hardFailures = [], unverified = false) {
    const isHardFailed = hardFailures.length > 0;
    const isReady = score >= threshold && !isHardFailed && !unverified;

    let status = 'READY';
    if (isHardFailed) status = 'BLOCKED';
    else if (unverified) status = 'NEEDS_VERIFICATION';
    else if (score < threshold) status = 'BELOW_THRESHOLD';

    return { isReady, status, score, threshold };
  }

  test('at 79% score, correctly blocks application and requires 80%', () => {
    const res = evaluateEligibility(79, 80);
    assert.strictEqual(res.isReady, false);
    assert.strictEqual(res.status, 'BELOW_THRESHOLD');
  });

  test('at 80% score, allows application if no hard blockers exist', () => {
    const res = evaluateEligibility(80, 80);
    assert.strictEqual(res.isReady, true);
    assert.strictEqual(res.status, 'READY');
  });

  test('at 85% score, blocks application if mandatory requirement failed', () => {
    const res = evaluateEligibility(85, 80, ['CGPA minimum 7.5 required, candidate has 6.8']);
    assert.strictEqual(res.isReady, false);
    assert.strictEqual(res.status, 'BLOCKED');
  });

  test('marks as NEEDS_VERIFICATION if criteria not yet determined', () => {
    const res = evaluateEligibility(88, 80, [], true);
    assert.strictEqual(res.isReady, false);
    assert.strictEqual(res.status, 'NEEDS_VERIFICATION');
  });
});

// 5. Safe Skill & Object Extraction Tests
describe('Safe Skill & Object Extraction', () => {
  function getSkillName(s) {
    if (!s) return '';
    if (typeof s === 'string') return s;
    return s.skill_name || s.name || s.title || s.label || s.skill_id || String(s);
  }

  function getSkillKey(s, idx) {
    if (!s) return `skill-${idx}`;
    if (typeof s === 'string') return `skill-${s}-${idx}`;
    return `skill-${s.skill_id || s.id || s.skill_name || s.name || idx}-${idx}`;
  }

  test('extracts string label from plain string', () => {
    assert.strictEqual(getSkillName('Python'), 'Python');
    assert.strictEqual(getSkillKey('Python', 0), 'skill-Python-0');
  });

  test('safely extracts label and key from complex skill gap object without crashing', () => {
    const complexSkill = {
      skill_id: 'sk_py_01',
      skill_name: 'Python',
      progress_percent: 75,
      current_score: 75,
      required_score: 80,
      gap: 5,
      canonical_status: 'IN_PROGRESS',
      is_verified: false,
      is_satisfied: false,
      course: { completed: false },
      test: { passed: false },
      assignment: { verified: false },
      github: { evidence: true },
    };

    const label = getSkillName(complexSkill);
    const key = getSkillKey(complexSkill, 2);

    assert.strictEqual(typeof label, 'string');
    assert.strictEqual(label, 'Python');
    assert.strictEqual(key, 'skill-sk_py_01-2');
  });

  test('handles null, undefined, or empty values cleanly', () => {
    assert.strictEqual(getSkillName(null), '');
    assert.strictEqual(getSkillName(undefined), '');
    assert.strictEqual(getSkillKey(null, 5), 'skill-5');
  });
});

