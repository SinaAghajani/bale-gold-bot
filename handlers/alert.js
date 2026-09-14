const {
  getMarketData,
  getItemBySymbol,
} = require("../services/market.service");

const {
  createAlert,
  getUserAlerts,
  deleteUserAlert,
} = require("../services/alert.service");

const alertSessions = new Map();

function formatNumber(value) {
  return Number(value).toLocaleString("fa-IR");
}

function parsePrice(value) {
  const normalized = String(value)
    .trim()
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٬,]/g, "")
    .replace(/٫/g, ".");

  const price = Number(normalized);

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  return price;
}

function createAlertMenu() {
  return {
    keyboard: [
      [{ text: "🔔 ثبت هشدار" }, { text: "📋 هشدارهای من" }],
      [{ text: "🗑 حذف هشدار" }],
      [{ text: "↩️ بازگشت" }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

function createCancelMenu() {
  return {
    keyboard: [[{ text: "❌ لغو عملیات" }]],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

function createAssetMenu() {
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

function createKaratLikeInputMenu() {
  return {
    keyboard: [[{ text: "❌ لغو عملیات" }]],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

function createAlertSymbol(text) {
  if (text === "🥇 طلای ۱۸ عیار") {
    return {
      symbol: "IR_GOLD_18K",
      name: "طلای ۱۸ عیار",
    };
  }

  if (text === "🪙 سکه امامی") {
    return {
      symbol: "IR_COIN_EMAMI",
      name: "سکه امامی",
    };
  }

  if (text === "💵 دلار") {
    return {
      symbol: "USD",
      name: "دلار",
    };
  }

  return null;
}

async function startAlert(bot, chatId) {
  alertSessions.set(String(chatId), {
    step: "asset",
  });

  await bot.sendMessage(
    chatId,
    `
🔔 هشدار قیمت

برای کدام مورد می‌خواهید هشدار تنظیم کنید؟

یکی از گزینه‌های زیر را انتخاب کنید:
`,
    {
      reply_markup: createAssetMenu(),
    },
  );
}

async function showUserAlerts(bot, chatId) {
  const alerts = getUserAlerts(chatId);

  if (!alerts.length) {
    await bot.sendMessage(
      chatId,
      "📋 شما در حال حاضر هیچ هشدار فعالی ندارید.",
      {
        reply_markup: createAlertMenu(),
      },
    );

    return;
  }

  const lines = alerts.map((alert, index) => {
    const direction =
      alert.direction === "above" ? "رسیدن به بالا" : "رسیدن به پایین";

    return `${index + 1}️⃣ ${alert.name}
🎯 ${formatNumber(alert.targetPrice)} تومان
📌 شرط: ${direction}`;
  });

  await bot.sendMessage(
    chatId,
    `
📋 هشدارهای فعال شما

${lines.join("\n\n")}
`,
    {
      reply_markup: createAlertMenu(),
    },
  );
}

async function startDeleteAlert(bot, chatId) {
  const alerts = getUserAlerts(chatId);

  if (!alerts.length) {
    await bot.sendMessage(chatId, "🗑 هیچ هشدار فعالی برای حذف وجود ندارد.", {
      reply_markup: createAlertMenu(),
    });

    return;
  }

  const lines = alerts.map(
    (alert, index) =>
      `${index + 1}️⃣ ${alert.name} — ${formatNumber(alert.targetPrice)} تومان`,
  );

  alertSessions.set(String(chatId), {
    step: "delete",
  });

  await bot.sendMessage(
    chatId,
    `
🗑 حذف هشدار

شماره هشدار موردنظر را وارد کنید:

${lines.join("\n")}
`,
    {
      reply_markup: createCancelMenu(),
    },
  );
}

async function handleAlert(bot, message) {
  const chatId = message.chat.id;
  const chatKey = String(chatId);
  const text = message.text?.trim();

  if (!text) {
    return false;
  }

  const session = alertSessions.get(chatKey);

  if (!session) {
    return false;
  }

  if (text === "❌ لغو عملیات" || text === "❌ لغو" || text === "/cancel") {
    alertSessions.delete(chatKey);

    await bot.sendMessage(chatId, "❌ عملیات هشدار لغو شد.", {
      reply_markup: createAlertMenu(),
    });

    return true;
  }

  if (session.step === "asset") {
    const asset = createAlertSymbol(text);

    if (!asset) {
      await bot.sendMessage(
        chatId,
        "❌ لطفاً یکی از دارایی‌های نمایش‌داده‌شده را انتخاب کنید.",
        {
          reply_markup: createAssetMenu(),
        },
      );

      return true;
    }

    try {
      const data = await getMarketData();

      const item = getItemBySymbol(data, asset.symbol);

      if (!item || typeof item.price !== "number") {
        await bot.sendMessage(
          chatId,
          "❌ قیمت این دارایی در حال حاضر در دسترس نیست.",
          {
            reply_markup: createAlertMenu(),
          },
        );

        alertSessions.delete(chatKey);

        return true;
      }

      alertSessions.set(chatKey, {
        step: "target",
        symbol: asset.symbol,
        name: asset.name,
        currentPrice: Number(item.price),
        unit: item.unit || "تومان",
      });

      await bot.sendMessage(
        chatId,
        `
🔔 تنظیم هشدار ${asset.name}

💰 قیمت فعلی:
${formatNumber(item.price)} ${item.unit || "تومان"}

🎯 قیمت هدف را وارد کنید.

مثال:
24000000

می‌توانید عدد را فارسی یا انگلیسی وارد کنید.
`,
        {
          reply_markup: createKaratLikeInputMenu(),
        },
      );
    } catch (error) {
      console.error(
        "Alert market API error:",
        error.response?.data || error.message,
      );

      alertSessions.delete(chatKey);

      await bot.sendMessage(chatId, "❌ دریافت قیمت فعلی با خطا مواجه شد.", {
        reply_markup: createAlertMenu(),
      });
    }

    return true;
  }

  if (session.step === "target") {
    const targetPrice = parsePrice(text);

    if (!targetPrice) {
      await bot.sendMessage(
        chatId,
        "❌ قیمت واردشده معتبر نیست.\n\nلطفاً قیمت هدف را به‌صورت عددی وارد کنید.",
        {
          reply_markup: createCancelMenu(),
        },
      );

      return true;
    }

    if (targetPrice === session.currentPrice) {
      await bot.sendMessage(
        chatId,
        `
⚠️ قیمت هدف نباید دقیقاً برابر قیمت فعلی باشد.

💰 قیمت فعلی:
${formatNumber(session.currentPrice)} ${session.unit}

لطفاً یک قیمت بالاتر یا پایین‌تر وارد کنید.
`,
        {
          reply_markup: createCancelMenu(),
        },
      );

      return true;
    }

    const alert = createAlert(
      chatId,
      session.symbol,
      session.name,
      targetPrice,
      session.currentPrice,
    );

    alertSessions.delete(chatKey);

    const condition =
      alert.direction === "above"
        ? "وقتی قیمت به این مقدار یا بیشتر برسد"
        : "وقتی قیمت به این مقدار یا کمتر برسد";

    await bot.sendMessage(
      chatId,
      `
✅ هشدار با موفقیت ثبت شد

${alert.name}

💰 قیمت فعلی:
${formatNumber(session.currentPrice)} ${session.unit}

🎯 قیمت هدف:
${formatNumber(targetPrice)} ${session.unit}

🔔 شرط:
${condition}

به‌محض رسیدن قیمت به محدوده تعیین‌شده، به شما اطلاع می‌دهم.
`,
      {
        reply_markup: createAlertMenu(),
      },
    );

    return true;
  }

  if (session.step === "delete") {
    const normalized = String(text)
      .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
      .trim();

    const index = Number(normalized) - 1;

    if (!Number.isInteger(index) || index < 0) {
      await bot.sendMessage(
        chatId,
        "❌ شماره هشدار معتبر نیست.\n\nلطفاً شماره یکی از هشدارهای موجود را وارد کنید.",
        {
          reply_markup: createCancelMenu(),
        },
      );

      return true;
    }

    const deletedAlert = deleteUserAlert(chatId, index);

    if (!deletedAlert) {
      await bot.sendMessage(chatId, "❌ هشدار موردنظر پیدا نشد.", {
        reply_markup: createAlertMenu(),
      });

      alertSessions.delete(chatKey);

      return true;
    }

    alertSessions.delete(chatKey);

    await bot.sendMessage(
      chatId,
      `
✅ هشدار حذف شد

${deletedAlert.name}

🎯 ${formatNumber(deletedAlert.targetPrice)} تومان
`,
      {
        reply_markup: createAlertMenu(),
      },
    );

    return true;
  }

  return false;
}

module.exports = {
  startAlert,
  showUserAlerts,
  startDeleteAlert,
  handleAlert,
  createAlertMenu,
};
