/**
 * In-memory cache & deduplication service for Opportunity Hover Previews (Internships & Scholarships).
 * Ensures zero redundant network calls, deduplicates concurrent requests, and guarantees user isolation.
 */

const previewCache = new Map();
const inFlightRequests = new Map();

function buildKey(type, id, email = '') {
  return `${type}:${String(id)}:${String(email).trim().toLowerCase()}`;
}

export function getCachedPreviewDetail(type, id, email = '') {
  if (!id) return null;
  const key = buildKey(type, id, email);
  return previewCache.get(key) || null;
}

export function setCachedPreviewDetail(type, id, email = '', data) {
  if (!id || !data) return;
  const key = buildKey(type, id, email);
  previewCache.set(key, data);
}

export async function fetchPreviewDetailWithCache(type, id, email = '', fetcher) {
  if (!id || typeof fetcher !== 'function') return null;
  const key = buildKey(type, id, email);

  // Return existing cache immediately
  if (previewCache.has(key)) {
    return previewCache.get(key);
  }

  // Deduplicate concurrent requests
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
    } catch (err) {
      console.warn(`[opportunityPreviewCache] Failed to fetch ${type} detail ${id}:`, err);
      return null;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, promise);
  return promise;
}

export function clearOpportunityPreviewCache() {
  previewCache.clear();
  inFlightRequests.clear();
}
