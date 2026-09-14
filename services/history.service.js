const fs = require("fs");
const path = require("path");

const HISTORY_FILE = path.join(__dirname, "..", "storage", "history.json");

const MAX_HISTORY_RECORDS = 10000;

function ensureStorage() {
  const storageDirectory = path.dirname(HISTORY_FILE);

  if (!fs.existsSync(storageDirectory)) {
    fs.mkdirSync(storageDirectory, { recursive: true });
  }

  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, "[]", "utf8");
  }
}

function loadHistory() {
  ensureStorage();

  try {
    const content = fs.readFileSync(HISTORY_FILE, "utf8");

    const history = JSON.parse(content);

    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error("History load error:", error.message);

    return [];
  }
}

function saveHistory(history) {
  ensureStorage();

  const temporaryFile = `${HISTORY_FILE}.tmp`;

  fs.writeFileSync(temporaryFile, JSON.stringify(history, null, 2), "utf8");

  fs.renameSync(temporaryFile, HISTORY_FILE);
}

function createSnapshot(item, symbol, name) {
  if (!item || !Number.isFinite(Number(item.price))) {
    return null;
  }

  return {
    symbol,
    name,
    price: Number(item.price),
    unit: item.unit || "تومان",
    changeValue: Number.isFinite(Number(item.change_value))
      ? Number(item.change_value)
      : 0,
    changePercent: Number.isFinite(Number(item.change_percent))
      ? Number(item.change_percent)
      : 0,
    date: item.date || "",
    time: item.time || "",
    recordedAt: new Date().toISOString(),
  };
}

function addSnapshot(item, symbol, name) {
  const snapshot = createSnapshot(item, symbol, name);

  if (!snapshot) {
    return;
  }

  const history = loadHistory();

  const lastRecord = [...history]
    .reverse()
    .find((record) => record.symbol === symbol);

  if (
    lastRecord &&
    lastRecord.price === snapshot.price &&
    lastRecord.date === snapshot.date &&
    lastRecord.time === snapshot.time
  ) {
    return;
  }

  history.push(snapshot);

  const symbolHistory = history.filter((record) => record.symbol === symbol);

  if (symbolHistory.length > MAX_HISTORY_RECORDS) {
    const recordsToRemove = symbolHistory.length - MAX_HISTORY_RECORDS;

    const idsToRemove = new Set(
      symbolHistory
        .slice(0, recordsToRemove)
        .map((record) => record.recordedAt),
    );

    const filteredHistory = history.filter(
      (record) => !idsToRemove.has(record.recordedAt),
    );

    saveHistory(filteredHistory);

    return;
  }

  saveHistory(history);
}

function addMarketSnapshot(data) {
  if (!data) {
    return;
  }

  const snapshots = [
    {
      item: data.gold?.find((item) => item.symbol === "IR_GOLD_18K"),
      symbol: "IR_GOLD_18K",
      name: "طلای ۱۸ عیار",
    },
    {
      item: data.gold?.find((item) => item.symbol === "IR_COIN_EMAMI"),
      symbol: "IR_COIN_EMAMI",
      name: "سکه امامی",
    },
    {
      item: data.currency?.find((item) => item.symbol === "USD"),
      symbol: "USD",
      name: "دلار",
    },
  ];

  for (const snapshot of snapshots) {
    addSnapshot(snapshot.item, snapshot.symbol, snapshot.name);
  }
}

function getHistory(symbol, limit = 10) {
  const history = loadHistory();

  const normalizedLimit = Math.max(1, Math.min(Number(limit) || 10, 100));

  return history
    .filter((record) => record.symbol === symbol)
    .slice(-normalizedLimit)
    .reverse();
}

function getAllHistory(limit = 10) {
  const history = loadHistory();

  const normalizedLimit = Math.max(1, Math.min(Number(limit) || 10, 100));

  return history.slice(-normalizedLimit).reverse();
}

module.exports = {
  addSnapshot,
  addMarketSnapshot,
  getHistory,
  getAllHistory,
};
