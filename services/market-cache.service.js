let cachedMarketData = null;
let cachedAt = 0;

const CACHE_TTL = 2 * 60 * 1000;

function isCacheValid() {
  if (!cachedMarketData || !cachedAt) {
    return false;
  }

  return Date.now() - cachedAt < CACHE_TTL;
}

function getCachedMarketData() {
  if (!isCacheValid()) {
    return null;
  }

  return cachedMarketData;
}

function setCachedMarketData(data) {
  if (!data) {
    return;
  }

  cachedMarketData = data;
  cachedAt = Date.now();
}

function clearMarketCache() {
  cachedMarketData = null;
  cachedAt = 0;
}

function getCacheStatus() {
  if (!cachedMarketData || !cachedAt) {
    return {
      exists: false,
      age: null,
      remaining: 0,
    };
  }

  const age = Date.now() - cachedAt;
  const remaining = Math.max(CACHE_TTL - age, 0);

  return {
    exists: true,
    age,
    remaining,
    valid: age < CACHE_TTL,
    cachedAt: new Date(cachedAt).toISOString(),
  };
}

module.exports = {
  getCachedMarketData,
  setCachedMarketData,
  clearMarketCache,
  getCacheStatus,
};
