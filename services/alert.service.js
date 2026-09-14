const fs = require("fs");
const path = require("path");

const ALERTS_FILE = path.join(__dirname, "..", "storage", "alerts.json");

function ensureStorage() {
  const storageDirectory = path.dirname(ALERTS_FILE);

  if (!fs.existsSync(storageDirectory)) {
    fs.mkdirSync(storageDirectory, { recursive: true });
  }

  if (!fs.existsSync(ALERTS_FILE)) {
    fs.writeFileSync(ALERTS_FILE, "[]", "utf8");
  }
}

function loadAlerts() {
  ensureStorage();

  try {
    const content = fs.readFileSync(ALERTS_FILE, "utf8");

    const alerts = JSON.parse(content);

    return Array.isArray(alerts) ? alerts : [];
  } catch (error) {
    console.error("Alerts load error:", error.message);

    return [];
  }
}

function saveAlerts(alerts) {
  ensureStorage();

  const temporaryFile = `${ALERTS_FILE}.tmp`;

  fs.writeFileSync(temporaryFile, JSON.stringify(alerts, null, 2), "utf8");

  fs.renameSync(temporaryFile, ALERTS_FILE);
}

function createAlert(chatId, symbol, name, targetPrice, currentPrice) {
  const alerts = loadAlerts();

  const normalizedTarget = Number(targetPrice);

  const normalizedCurrent = Number(currentPrice);

  if (
    !Number.isFinite(normalizedTarget) ||
    !Number.isFinite(normalizedCurrent) ||
    normalizedTarget <= 0 ||
    normalizedCurrent <= 0
  ) {
    throw new Error("Invalid alert price");
  }

  const direction = normalizedTarget > normalizedCurrent ? "above" : "below";

  const alert = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    chatId: String(chatId),
    symbol,
    name,
    targetPrice: normalizedTarget,
    currentPrice: normalizedCurrent,
    direction,
    createdAt: new Date().toISOString(),
  };

  alerts.push(alert);

  saveAlerts(alerts);

  return alert;
}

function getUserAlerts(chatId) {
  const alerts = loadAlerts();

  return alerts.filter((alert) => String(alert.chatId) === String(chatId));
}

function deleteUserAlert(chatId, index) {
  const alerts = loadAlerts();

  const userAlerts = alerts.filter(
    (alert) => String(alert.chatId) === String(chatId),
  );

  if (!userAlerts[index]) {
    return null;
  }

  const alertToDelete = userAlerts[index];

  const remainingAlerts = alerts.filter(
    (alert) => alert.id !== alertToDelete.id,
  );

  saveAlerts(remainingAlerts);

  return alertToDelete;
}

function checkCondition(alert, currentPrice) {
  const price = Number(currentPrice);

  const target = Number(alert.targetPrice);

  if (!Number.isFinite(price) || !Number.isFinite(target)) {
    return false;
  }

  if (alert.direction === "above") {
    return price >= target;
  }

  if (alert.direction === "below") {
    return price <= target;
  }

  return false;
}

function findMarketItem(data, symbol) {
  const items = [
    ...(data.gold || []),
    ...(data.currency || []),
    ...(data.cryptocurrency || []),
  ];

  return items.find((item) => item.symbol === symbol) || null;
}

function formatPrice(value) {
  return Number(value).toLocaleString("fa-IR");
}

async function checkAlerts(bot, data) {
  const alerts = loadAlerts();

  if (!alerts.length) {
    return;
  }

  const remainingAlerts = [];

  for (const alert of alerts) {
    const item = findMarketItem(data, alert.symbol);

    if (!item || !Number.isFinite(Number(item.price))) {
      remainingAlerts.push(alert);

      continue;
    }

    const currentPrice = Number(item.price);

    const triggered = checkCondition(alert, currentPrice);

    if (!triggered) {
      remainingAlerts.push(alert);

      continue;
    }

    const conditionText =
      alert.direction === "above" ? "به بالاتر از" : "به پایین‌تر از";

    const text = `
🔔 هشدار قیمت فعال شد

${alert.name}

💰 قیمت فعلی:
${formatPrice(currentPrice)} ${item.unit || "تومان"}

🎯 قیمت هدف:
${formatPrice(alert.targetPrice)} ${item.unit || "تومان"}

📈 قیمت ${conditionText} محدوده تعیین‌شده رسید.
`;

    try {
      await bot.sendMessage(alert.chatId, text);
    } catch (error) {
      console.error(
        "Alert notification error:",
        error.response?.data || error.message,
      );

      remainingAlerts.push(alert);
    }
  }

  saveAlerts(remainingAlerts);
}

module.exports = {
  createAlert,
  getUserAlerts,
  deleteUserAlert,
  checkAlerts,
};
