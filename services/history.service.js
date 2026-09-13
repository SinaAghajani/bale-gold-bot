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

  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf8");
}

function createSnapshot(item, symbol, name) {
  if (!item || typeof item.price !== "number") {
    return null;
  }

  return {
    symbol,
    name,
    price: item.price,
    unit: item.unit || "تومان",
    changeValue: typeof item.change_value === "number" ? item.change_value : 0,
    changePercent:
      typeof item.change_percent === "number" ? item.change_percent : 0,
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

  history.push(snapshot);

  const symbolHistory = history.filter((record) => record.symbol === symbol);

  if (symbolHistory.length > MAX_HISTORY_RECORDS) {
    const firstToRemove = symbolHistory.length - MAX_HISTORY_RECORDS;
    const removeIds = new Set(
      symbolHistory.slice(0, firstToRemove).map((record) => record.recordedAt),
    );

    const filteredHistory = history.filter(
      (record) => !removeIds.has(record.recordedAt),
    );

    saveHistory(filteredHistory);
    return;
  }

  saveHistory(history);
}

function addMarketSnapshot(data) {
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

  return history
    .filter((record) => record.symbol === symbol)
    .slice(-limit)
    .reverse();
}

function getAllHistory(limit = 10) {
  const history = loadHistory();

  return history.slice(-limit).reverse();
}

module.exports = {
  addSnapshot,
  addMarketSnapshot,
  getHistory,
  getAllHistory,
};
