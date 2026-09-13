const axios = require("axios");
const { brsApiKey, brsApiUrl } = require("../config");
const { analyzeMarket } = require("../services/ai.service");
const { startCalculator, handleCalculator } = require("./calculator");
const {
  startAlert,
  showUserAlerts,
  startDeleteAlert,
  handleAlert,
} = require("./alert");
const { startHistory, handleHistory } = require("./history");
const { handleStart } = require("./start");
const { getAllHistory } = require("../services/history.service");

function formatNumber(value) {
  if (value === undefined || value === null) {
    return "-";
  }

  return Number(value).toLocaleString("fa-IR");
}

function formatChange(value, percent) {
  if (value > 0) {
    return `🟢 +${formatNumber(value)} (+${percent}%)`;
  }

  if (value < 0) {
    return `🔴 ${formatNumber(value)} (${percent}%)`;
  }

  return "⚪ بدون تغییر";
}

function findItem(items, symbol) {
  return items?.find((item) => item.symbol === symbol);
}

async function getMarketData() {
  const response = await axios.get(brsApiUrl, {
    params: {
      key: brsApiKey,
    },
    timeout: 10000,
  });

  return response.data;
}

function createPriceLine(item) {
  if (!item) {
    return "❌ اطلاعات در دسترس نیست";
  }

  return `💰 ${formatNumber(item.price)} ${item.unit}\n${formatChange(
    item.change_value,
    item.change_percent,
  )}`;
}

function getAllMarketItems(data) {
  return [...(data.gold || []), ...(data.currency || [])].filter(
    (item) =>
      typeof item.price === "number" && typeof item.change_percent === "number",
  );
}

function getHighestChange(items) {
  return items.reduce((highest, item) => {
    if (!highest || item.change_percent > highest.change_percent) {
      return item;
    }

    return highest;
  }, null);
}

function getLowestChange(items) {
  return items.reduce((lowest, item) => {
    if (!lowest || item.change_percent < lowest.change_percent) {
      return item;
    }

    return lowest;
  }, null);
}

function getChangeIcon(percent) {
  if (percent > 0) {
    return "🟢";
  }

  if (percent < 0) {
    return "🔴";
  }

  return "⚪";
}

async function sendGoldPrices(bot, chatId, data) {
  const gold18 = findItem(data.gold, "IR_GOLD_18K");
  const gold24 = findItem(data.gold, "IR_GOLD_24K");
  const melted = findItem(data.gold, "IR_GOLD_MELTED");
  const ounce = findItem(data.gold, "XAUUSD");

  const text = `
🥇 قیمت لحظه‌ای طلا

🔸 طلای ۱۸ عیار
${createPriceLine(gold18)}

🔸 طلای ۲۴ عیار
${createPriceLine(gold24)}

🔸 طلای آب‌شده
${createPriceLine(melted)}

🔸 انس طلا
${createPriceLine(ounce)}

🕐 آخرین بروزرسانی:
${gold18?.date || "-"} | ${gold18?.time || "-"}
`;

  await bot.sendMessage(chatId, text);
}

async function sendCoinPrices(bot, chatId, data) {
  const emami = findItem(data.gold, "IR_COIN_EMAMI");
  const half = findItem(data.gold, "IR_COIN_HALF");
  const quarter = findItem(data.gold, "IR_COIN_QUARTER");
  const oneGram = findItem(data.gold, "IR_COIN_1G");
  const bahar = findItem(data.gold, "IR_COIN_BAHAR");

  const text = `
🪙 قیمت لحظه‌ای سکه

🔸 سکه امامی
${createPriceLine(emami)}

🔸 سکه بهار آزادی
${createPriceLine(bahar)}

🔸 نیم سکه
${createPriceLine(half)}

🔸 ربع سکه
${createPriceLine(quarter)}

🔸 سکه یک گرمی
${createPriceLine(oneGram)}

🕐 آخرین بروزرسانی:
${emami?.date || "-"} | ${emami?.time || "-"}
`;

  await bot.sendMessage(chatId, text);
}

async function sendCurrencyPrices(bot, chatId, data) {
  const usd = findItem(data.currency, "USD");
  const euro = findItem(data.currency, "EUR");
  const pound = findItem(data.currency, "GBP");
  const aed = findItem(data.currency, "AED");
  const usdt = findItem(data.currency, "USDT_IRT");

  const text = `
💵 قیمت لحظه‌ای ارز

🔸 دلار
${createPriceLine(usd)}

🔸 یورو
${createPriceLine(euro)}

🔸 پوند
${createPriceLine(pound)}

🔸 درهم امارات
${createPriceLine(aed)}

🔸 دلار تتر
${createPriceLine(usdt)}

🕐 آخرین بروزرسانی:
${usd?.date || "-"} | ${usd?.time || "-"}
`;

  await bot.sendMessage(chatId, text);
}

async function sendMarketStatus(bot, chatId, data) {
  const gold18 = findItem(data.gold, "IR_GOLD_18K");
  const emami = findItem(data.gold, "IR_COIN_EMAMI");
  const usd = findItem(data.currency, "USD");

  const marketItems = getAllMarketItems(data);
  const highest = getHighestChange(marketItems);
  const lowest = getLowestChange(marketItems);

  const text = `
📊 وضعیت بازار

📈 بیشترین رشد
${
  highest
    ? `${getChangeIcon(highest.change_percent)} ${highest.name}
+${highest.change_percent}%`
    : "❌ اطلاعات در دسترس نیست"
}

📉 بیشترین کاهش
${
  lowest
    ? `${getChangeIcon(lowest.change_percent)} ${lowest.name}
${lowest.change_percent}%`
    : "❌ اطلاعات در دسترس نیست"
}

━━━━━━━━━━━━

🥇 طلا
${gold18?.name || "طلای ۱۸ عیار"}
💰 ${formatNumber(gold18?.price)} ${gold18?.unit || "تومان"}
${formatChange(gold18?.change_value || 0, gold18?.change_percent || 0)}

🪙 سکه
${emami?.name || "سکه امامی"}
💰 ${formatNumber(emami?.price)} ${emami?.unit || "تومان"}
${formatChange(emami?.change_value || 0, emami?.change_percent || 0)}

💵 ارز
${usd?.name || "دلار"}
💰 ${formatNumber(usd?.price)} ${usd?.unit || "تومان"}
${formatChange(usd?.change_value || 0, usd?.change_percent || 0)}

━━━━━━━━━━━━

🕐 آخرین بروزرسانی:
${usd?.date || gold18?.date || "-"} | ${usd?.time || gold18?.time || "-"}
`;

  await bot.sendMessage(chatId, text);
}

async function sendMarketRefresh(bot, chatId, data) {
  const gold18 = findItem(data.gold, "IR_GOLD_18K");
  const emami = findItem(data.gold, "IR_COIN_EMAMI");
  const usd = findItem(data.currency, "USD");

  const text = `
🔄 آخرین وضعیت بازار

🥇 طلای ۱۸ عیار
💰 ${formatNumber(gold18?.price)} تومان
${formatChange(gold18?.change_value || 0, gold18?.change_percent || 0)}

🪙 سکه امامی
💰 ${formatNumber(emami?.price)} تومان
${formatChange(emami?.change_value || 0, emami?.change_percent || 0)}

💵 دلار
💰 ${formatNumber(usd?.price)} تومان
${formatChange(usd?.change_value || 0, usd?.change_percent || 0)}

🕐 آخرین بروزرسانی:
${usd?.date || gold18?.date || "-"} | ${usd?.time || gold18?.time || "-"}
`;

  await bot.sendMessage(chatId, text);
}

async function handleMessage(bot, message) {
  const chatId = message.chat.id;
  const text = message.text?.trim();

  if (!text) {
    return;
  }

  const calculatorHandled = await handleCalculator(bot, message);

  if (calculatorHandled) {
    return;
  }

  const alertHandled = await handleAlert(bot, message);

  if (alertHandled) {
    return;
  }

  const historyHandled = await handleHistory(bot, message);

  if (historyHandled) {
    return;
  }

  if (text === "↩️ بازگشت") {
    await handleStart(bot, chatId);
    return;
  }

  if (text === "🔔 هشدار قیمت") {
    await startAlert(bot, chatId);
    return;
  }

  if (text === "🔔 ثبت هشدار") {
    await startAlert(bot, chatId);
    return;
  }

  if (text === "📋 هشدارهای من") {
    await showUserAlerts(bot, chatId);
    return;
  }

  if (text === "🗑 حذف هشدار") {
    await startDeleteAlert(bot, chatId);
    return;
  }

  if (text === "📅 تاریخچه قیمت") {
    await startHistory(bot, chatId);
    return;
  }

  if (text === "🥇 قیمت طلا") {
    await bot.sendMessage(chatId, "⏳ در حال دریافت آخرین قیمت‌های طلا...");

    try {
      const data = await getMarketData();
      await sendGoldPrices(bot, chatId, data);
    } catch (error) {
      console.error("Gold API error:", error.response?.data || error.message);

      await bot.sendMessage(
        chatId,
        "❌ دریافت قیمت طلا با خطا مواجه شد.\nلطفاً چند لحظه دیگر دوباره تلاش کنید.",
      );
    }

    return;
  }

  if (text === "🪙 قیمت سکه") {
    await bot.sendMessage(chatId, "⏳ در حال دریافت آخرین قیمت‌های سکه...");

    try {
      const data = await getMarketData();
      await sendCoinPrices(bot, chatId, data);
    } catch (error) {
      console.error("Coin API error:", error.response?.data || error.message);

      await bot.sendMessage(
        chatId,
        "❌ دریافت قیمت سکه با خطا مواجه شد.\nلطفاً چند لحظه دیگر دوباره تلاش کنید.",
      );
    }

    return;
  }

  if (text === "💵 قیمت ارز") {
    await bot.sendMessage(chatId, "⏳ در حال دریافت آخرین قیمت‌های ارز...");

    try {
      const data = await getMarketData();
      await sendCurrencyPrices(bot, chatId, data);
    } catch (error) {
      console.error(
        "Currency API error:",
        error.response?.data || error.message,
      );

      await bot.sendMessage(
        chatId,
        "❌ دریافت قیمت ارز با خطا مواجه شد.\nلطفاً چند لحظه دیگر دوباره تلاش کنید.",
      );
    }

    return;
  }

  if (text === "📊 وضعیت بازار") {
    await bot.sendMessage(chatId, "⏳ در حال تحلیل وضعیت بازار...");

    try {
      const data = await getMarketData();
      await sendMarketStatus(bot, chatId, data);
    } catch (error) {
      console.error(
        "Market status API error:",
        error.response?.data || error.message,
      );

      await bot.sendMessage(
        chatId,
        "❌ دریافت وضعیت بازار با خطا مواجه شد.\nلطفاً چند لحظه دیگر دوباره تلاش کنید.",
      );
    }

    return;
  }

  if (text === "🤖 تحلیل هوشمند بازار") {
    await bot.sendMessage(
      chatId,
      "🤖 در حال بررسی قیمت‌های فعلی و روند کوتاه‌مدت بازار...",
    );

    try {
      const data = await getMarketData();
      const history = getAllHistory(30);

      const analysis = await analyzeMarket(data, history);

      await bot.sendMessage(chatId, analysis);
    } catch (error) {
      console.error(
        "AI market analysis error:",
        error.response?.data || error.message,
      );

      await bot.sendMessage(
        chatId,
        "❌ تحلیل هوشمند بازار با خطا مواجه شد.\n\nلطفاً چند لحظه دیگر دوباره تلاش کنید.",
      );
    }

    return;
  }

  if (text === "🧮 محاسبه قیمت طلا") {
    await startCalculator(bot, chatId);
    return;
  }

  if (text === "🔄 بروزرسانی قیمت‌ها") {
    await bot.sendMessage(chatId, "🔄 در حال دریافت آخرین قیمت‌های بازار...");

    try {
      const data = await getMarketData();
      await sendMarketRefresh(bot, chatId, data);
    } catch (error) {
      console.error("Market API error:", error.response?.data || error.message);

      await bot.sendMessage(
        chatId,
        "❌ بروزرسانی قیمت‌ها انجام نشد.\nلطفاً چند لحظه دیگر دوباره تلاش کنید.",
      );
    }

    return;
  }

  await bot.sendMessage(chatId, "لطفاً یکی از گزینه‌های منو را انتخاب کنید.");
}

module.exports = {
  handleMessage,
};
