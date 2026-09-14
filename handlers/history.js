const { getHistory } = require("../services/history.service");

function formatNumber(value) {
  return Number(value).toLocaleString("fa-IR");
}

function createHistoryMenu() {
  return {
    keyboard: [
      [{ text: "🥇 طلای ۱۸ عیار" }],
      [{ text: "🪙 سکه امامی" }],
      [{ text: "💵 دلار" }],
      [{ text: "❌ لغو عملیات" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

function getMainMenu() {
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

function getHistoryConfig(text) {
  if (text === "🥇 طلای ۱۸ عیار") {
    return {
      symbol: "IR_GOLD_18K",
      title: "طلای ۱۸ عیار",
    };
  }

  if (text === "🪙 سکه امامی") {
    return {
      symbol: "IR_COIN_EMAMI",
      title: "سکه امامی",
    };
  }

  if (text === "💵 دلار") {
    return {
      symbol: "USD",
      title: "دلار",
    };
  }

  return null;
}

async function startHistory(bot, chatId) {
  await bot.sendMessage(
    chatId,
    `
📅 تاریخچه قیمت

دارایی موردنظر را انتخاب کنید:

🥇 طلای ۱۸ عیار
🪙 سکه امامی
💵 دلار

نکته:
این بخش بر اساس قیمت‌هایی است که ربات به‌صورت دوره‌ای ثبت کرده است.

هرچه ربات مدت بیشتری فعال باشد، اطلاعات بیشتری در تاریخچه ذخیره می‌شود.
`,
    {
      reply_markup: createHistoryMenu(),
    },
  );
}

async function showHistory(bot, chatId, text) {
  if (text === "❌ لغو عملیات") {
    await bot.sendMessage(chatId, "❌ مشاهده تاریخچه لغو شد.", {
      reply_markup: getMainMenu(),
    });

    return true;
  }

  if (text === "↩️ بازگشت") {
    return false;
  }

  const config = getHistoryConfig(text);

  if (!config) {
    return false;
  }

  const history = getHistory(config.symbol, 10);

  if (!history.length) {
    await bot.sendMessage(
      chatId,
      `
📅 تاریخچه ${config.title}

هنوز اطلاعاتی برای نمایش ثبت نشده است.

ربات باید مدتی فعال باشد تا قیمت‌ها در تاریخچه ذخیره شوند.
`,
      {
        reply_markup: createHistoryMenu(),
      },
    );

    return true;
  }

  const lines = history.map((record, index) => {
    const changePercent = Number(record.changePercent) || 0;

    const changeIcon =
      changePercent > 0 ? "🟢" : changePercent < 0 ? "🔴" : "⚪";

    const change = changePercent > 0 ? `+${changePercent}` : changePercent;

    return `${index + 1}️⃣ ${formatNumber(
      record.price,
    )} ${record.unit || "تومان"}
${changeIcon} ${change}٪
🕐 ${record.date || "-"} | ${record.time || "-"}`;
  });

  await bot.sendMessage(
    chatId,
    `
📅 تاریخچه ${config.title}

آخرین ۱۰ ثبت قیمت:

${lines.join("\n\n")}
`,
    {
      reply_markup: createHistoryMenu(),
    },
  );

  return true;
}

async function handleHistory(bot, message) {
  const chatId = message.chat.id;
  const text = message.text?.trim();

  if (!text) {
    return false;
  }

  return showHistory(bot, chatId, text);
}

module.exports = {
  startHistory,
  showHistory,
  handleHistory,
};
