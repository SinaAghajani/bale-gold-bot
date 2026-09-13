const axios = require("axios");
const { brsApiKey, brsApiUrl } = require("../config");

const calculatorSessions = new Map();

function formatNumber(value) {
  return Number(value).toLocaleString("fa-IR");
}

function parseWeight(value) {
  const normalized = String(value)
    .trim()
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/٫/g, ".")
    .replace(/,/g, "");

  const weight = Number(normalized);

  if (!Number.isFinite(weight) || weight <= 0 || weight > 100000) {
    return null;
  }

  return weight;
}

async function getGoldPrice(symbol) {
  const response = await axios.get(brsApiUrl, {
    params: {
      key: brsApiKey,
    },
    timeout: 10000,
  });

  const item = response.data.gold?.find((gold) => gold.symbol === symbol);

  if (!item) {
    throw new Error("Gold price not found");
  }

  return item;
}

async function startCalculator(bot, chatId) {
  calculatorSessions.set(chatId, {
    step: "weight",
  });

  await bot.sendMessage(
    chatId,
    `
🧮 محاسبه قیمت طلا

⚖️ وزن طلا را به گرم وارد کنید.

مثال:
5.25

می‌توانید عدد را به فارسی یا انگلیسی وارد کنید.
`,
  );
}

async function handleCalculator(bot, message) {
  const chatId = message.chat.id;
  const text = message.text?.trim();

  if (!text) {
    return false;
  }

  const session = calculatorSessions.get(chatId);

  if (!session) {
    return false;
  }

  if (text === "❌ لغو محاسبه") {
    calculatorSessions.delete(chatId);

    await bot.sendMessage(chatId, "❌ محاسبه قیمت طلا لغو شد.");

    return true;
  }

  if (session.step === "weight") {
    const weight = parseWeight(text);

    if (!weight) {
      await bot.sendMessage(
        chatId,
        "❌ وزن واردشده معتبر نیست.\n\nلطفاً وزن را به گرم وارد کنید.\nمثال: 5.25",
      );

      return true;
    }

    session.weight = weight;
    session.step = "karat";

    calculatorSessions.set(chatId, session);

    const keyboard = {
      keyboard: [
        [{ text: "🥇 18 عیار" }, { text: "💎 24 عیار" }],
        [{ text: "❌ لغو محاسبه" }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    };

    await bot.sendMessage(
      chatId,
      `
⚖️ وزن ثبت شد:

${formatNumber(weight)} گرم

💎 حالا عیار طلا را انتخاب کنید:
`,
      {
        reply_markup: keyboard,
      },
    );

    return true;
  }

  if (session.step === "karat") {
    let karat;
    let symbol;

    if (text === "🥇 18 عیار") {
      karat = 18;
      symbol = "IR_GOLD_18K";
    } else if (text === "💎 24 عیار") {
      karat = 24;
      symbol = "IR_GOLD_24K";
    } else {
      await bot.sendMessage(
        chatId,
        "لطفاً یکی از گزینه‌های عیار را انتخاب کنید.",
      );

      return true;
    }

    await bot.sendMessage(chatId, "⏳ در حال دریافت قیمت لحظه‌ای طلا...");

    try {
      const gold = await getGoldPrice(symbol);
      const totalPrice = session.weight * Number(gold.price);

      calculatorSessions.delete(chatId);

      const keyboard = {
        keyboard: [
          [{ text: "🥇 قیمت طلا" }, { text: "🪙 قیمت سکه" }],
          [{ text: "💵 قیمت ارز" }],
          [{ text: "📊 وضعیت بازار" }],
          [{ text: "🧮 محاسبه قیمت طلا" }],
          [{ text: "🔄 بروزرسانی قیمت‌ها" }],
        ],
        resize_keyboard: true,
      };

      const result = `
🧮 محاسبه قیمت طلا

⚖️ وزن:
${formatNumber(session.weight)} گرم

💎 عیار:
${karat} عیار

💰 قیمت هر گرم:
${formatNumber(gold.price)} ${gold.unit}

━━━━━━━━━━━━

💵 ارزش تقریبی طلا:
${formatNumber(totalPrice)} تومان

📊 تغییر قیمت:
${gold.change_percent > 0 ? "🟢" : gold.change_percent < 0 ? "🔴" : "⚪"} ${gold.change_percent > 0 ? "+" : ""}${gold.change_percent}٪

🕐 آخرین بروزرسانی:
${gold.date || "-"} | ${gold.time || "-"}
`;

      await bot.sendMessage(chatId, result, {
        reply_markup: keyboard,
      });
    } catch (error) {
      calculatorSessions.delete(chatId);

      console.error(
        "Gold calculator API error:",
        error.response?.data || error.message,
      );

      await bot.sendMessage(
        chatId,
        "❌ دریافت قیمت طلا با خطا مواجه شد.\nلطفاً چند لحظه دیگر دوباره تلاش کنید.",
      );
    }

    return true;
  }

  return false;
}

module.exports = {
  startCalculator,
  handleCalculator,
};
