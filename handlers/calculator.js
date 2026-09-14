const { getMarketData } = require("../services/market.service");

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

function getCalculatorKeyboard() {
  return {
    keyboard: [[{ text: "❌ لغو محاسبه" }]],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

function getKaratKeyboard() {
  return {
    keyboard: [
      [{ text: "🥇 18 عیار" }, { text: "💎 24 عیار" }],
      [{ text: "❌ لغو محاسبه" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

function getMainKeyboard() {
  return {
    keyboard: [
      [{ text: "🥇 قیمت طلا" }, { text: "🪙 قیمت سکه" }],
      [{ text: "💵 قیمت ارز" }],
      [{ text: "📊 وضعیت بازار" }, { text: "🤖 تحلیل هوشمند بازار" }],
      [{ text: "🧮 محاسبه قیمت طلا" }],
      [{ text: "🔔 هشدار قیمت" }, { text: "📅 تاریخچه قیمت" }],
      [{ text: "🔄 بروزرسانی قیمت‌ها" }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

async function startCalculator(bot, chatId) {
  calculatorSessions.set(String(chatId), {
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

برای لغو عملیات، دکمه زیر را بزنید.
`,
    {
      reply_markup: getCalculatorKeyboard(),
    },
  );
}

async function handleCalculator(bot, message) {
  const chatId = message.chat.id;
  const chatKey = String(chatId);
  const text = message.text?.trim();

  if (!text) {
    return false;
  }

  const session = calculatorSessions.get(chatKey);

  if (!session) {
    return false;
  }

  if (text === "❌ لغو محاسبه" || text === "لغو" || text === "/cancel") {
    calculatorSessions.delete(chatKey);

    await bot.sendMessage(chatId, "❌ محاسبه قیمت طلا لغو شد.", {
      reply_markup: getMainKeyboard(),
    });

    return true;
  }

  if (session.step === "weight") {
    const weight = parseWeight(text);

    if (!weight) {
      await bot.sendMessage(
        chatId,
        "❌ وزن واردشده معتبر نیست.\n\nلطفاً وزن را به گرم وارد کنید.\nمثال: 5.25",
        {
          reply_markup: getCalculatorKeyboard(),
        },
      );

      return true;
    }

    session.weight = weight;
    session.step = "karat";

    calculatorSessions.set(chatKey, session);

    await bot.sendMessage(
      chatId,
      `
⚖️ وزن ثبت شد:

${formatNumber(weight)} گرم

💎 حالا عیار طلا را انتخاب کنید:
`,
      {
        reply_markup: getKaratKeyboard(),
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
        "❌ لطفاً یکی از گزینه‌های عیار را انتخاب کنید.",
        {
          reply_markup: getKaratKeyboard(),
        },
      );

      return true;
    }

    await bot.sendMessage(chatId, "⏳ در حال دریافت قیمت لحظه‌ای طلا...");

    try {
      const data = await getMarketData();

      const gold = [...(data.gold || [])].find(
        (item) => item.symbol === symbol,
      );

      if (!gold) {
        throw new Error("Gold price not found");
      }

      const goldPrice = Number(gold.price);

      if (!Number.isFinite(goldPrice) || goldPrice <= 0) {
        throw new Error("Invalid gold price");
      }

      const totalPrice = session.weight * goldPrice;

      calculatorSessions.delete(chatKey);

      const changePercent = Number(gold.change_percent) || 0;

      const changeIcon =
        changePercent > 0 ? "🟢" : changePercent < 0 ? "🔴" : "⚪";

      const changeSign = changePercent > 0 ? "+" : "";

      const result = `
🧮 محاسبه قیمت طلا

⚖️ وزن:
${formatNumber(session.weight)} گرم

💎 عیار:
${karat} عیار

💰 قیمت هر گرم:
${formatNumber(goldPrice)} ${gold.unit || "تومان"}

━━━━━━━━━━━━

💵 ارزش تقریبی طلا:
${formatNumber(totalPrice)} تومان

📊 تغییر قیمت:
${changeIcon} ${changeSign}${changePercent}٪

🕐 آخرین بروزرسانی:
${gold.date || "-"} | ${gold.time || "-"}
`;

      await bot.sendMessage(chatId, result, {
        reply_markup: getMainKeyboard(),
      });
    } catch (error) {
      calculatorSessions.delete(chatKey);

      console.error(
        "Gold calculator error:",
        error.response?.data || error.message,
      );

      await bot.sendMessage(
        chatId,
        "❌ دریافت قیمت طلا با خطا مواجه شد.\nلطفاً چند لحظه دیگر دوباره تلاش کنید.",
        {
          reply_markup: getMainKeyboard(),
        },
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
