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

  fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2), "utf8");
}

function createAlert(chatId, symbol, name, targetPrice, currentPrice) {
  const alerts = loadAlerts();

  const direction = targetPrice > currentPrice ? "above" : "below";

  const alert = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    chatId: String(chatId),
    symbol,
    name,
    targetPrice,
    currentPrice,
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
  if (alert.direction === "above") {
    return currentPrice >= alert.targetPrice;
  }

  return currentPrice <= alert.targetPrice;
}

async function checkAlerts(bot, data) {
  const alerts = loadAlerts();

  if (!alerts.length) {
    return;
  }

  const remainingAlerts = [];

  for (const alert of alerts) {
    const items = [
      ...(data.gold || []),
      ...(data.currency || []),
      ...(data.cryptocurrency || []),
    ];

    const item = items.find((marketItem) => marketItem.symbol === alert.symbol);

    if (!item || typeof item.price !== "number") {
      remainingAlerts.push(alert);
      continue;
    }

    const triggered = checkCondition(alert, Number(item.price));

    if (!triggered) {
      remainingAlerts.push(alert);
      continue;
    }

    const conditionText =
      alert.direction === "above" ? "به بالاتر از" : "به پایین‌تر از";

    const currentPrice = Number(item.price).toLocaleString("fa-IR");

    const targetPrice = Number(alert.targetPrice).toLocaleString("fa-IR");

    const text = `
🔔 هشدار قیمت فعال شد

${alert.name}

💰 قیمت فعلی:
${currentPrice} ${item.unit || "تومان"}

🎯 قیمت هدف:
${targetPrice} ${item.unit || "تومان"}

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
