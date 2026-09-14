const fs = require("fs");
const path = require("path");

const USAGE_FILE = path.join(__dirname, "..", "storage", "api-usage.json");

const DAILY_LIMIT = 1500;
const WARNING_THRESHOLD = 0.8;
const CRITICAL_THRESHOLD = 0.95;

function ensureStorage() {
  const storageDirectory = path.dirname(USAGE_FILE);

  if (!fs.existsSync(storageDirectory)) {
    fs.mkdirSync(storageDirectory, { recursive: true });
  }

  if (!fs.existsSync(USAGE_FILE)) {
    fs.writeFileSync(
      USAGE_FILE,
      JSON.stringify(
        {
          date: getCurrentDate(),
          requests: 0,
          lastRequestAt: null,
        },
        null,
        2,
      ),
      "utf8",
    );
  }
}

function getCurrentDate() {
  return new Date().toISOString().slice(0, 10);
}

function loadUsage() {
  ensureStorage();

  try {
    const content = fs.readFileSync(USAGE_FILE, "utf8");
    const usage = JSON.parse(content);

    if (usage.date !== getCurrentDate()) {
      return {
        date: getCurrentDate(),
        requests: 0,
        lastRequestAt: null,
      };
    }

    return {
      date: usage.date,
      requests: typeof usage.requests === "number" ? usage.requests : 0,
      lastRequestAt: usage.lastRequestAt || null,
    };
  } catch (error) {
    console.error("API usage load error:", error.message);

    return {
      date: getCurrentDate(),
      requests: 0,
      lastRequestAt: null,
    };
  }
}

function saveUsage(usage) {
  ensureStorage();

  fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2), "utf8");
}

function canMakeRequest() {
  const usage = loadUsage();

  return usage.requests < DAILY_LIMIT;
}

function recordRequest() {
  const usage = loadUsage();

  usage.requests += 1;
  usage.lastRequestAt = new Date().toISOString();

  saveUsage(usage);

  return getUsageStatus();
}

function getUsageStatus() {
  const usage = loadUsage();

  const percentage = DAILY_LIMIT > 0 ? (usage.requests / DAILY_LIMIT) * 100 : 0;

  let status = "normal";

  if (percentage >= CRITICAL_THRESHOLD * 100) {
    status = "critical";
  } else if (percentage >= WARNING_THRESHOLD * 100) {
    status = "warning";
  }

  return {
    date: usage.date,
    requests: usage.requests,
    limit: DAILY_LIMIT,
    remaining: Math.max(DAILY_LIMIT - usage.requests, 0),
    percentage: Number(percentage.toFixed(2)),
    status,
    lastRequestAt: usage.lastRequestAt,
  };
}

function resetUsage() {
  const usage = {
    date: getCurrentDate(),
    requests: 0,
    lastRequestAt: null,
  };

  saveUsage(usage);

  return getUsageStatus();
}

module.exports = {
  canMakeRequest,
  recordRequest,
  getUsageStatus,
  resetUsage,
};
