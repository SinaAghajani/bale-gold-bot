const axios = require("axios");

const {
  openRouterApiKey,
  openRouterApiUrl,
  openRouterModel,
} = require("../config");

function getItem(items, symbol) {
  return items?.find((item) => item.symbol === symbol) || null;
}

function getHistoryPrices(history, symbol) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((record) => record.symbol === symbol)
    .slice(0, 10)
    .reverse()
    .map((record) => ({
      price: Number(record.price),
      changePercent: Number(record.changePercent) || 0,
      date: record.date || "",
      time: record.time || "",
    }));
}

function createMarketItem(item) {
  if (!item) {
    return null;
  }

  return {
    name: item.name || "",
    price: Number(item.price),
    unit: item.unit || "تومان",
    changeValue: Number(item.change_value) || 0,
    changePercent: Number(item.change_percent) || 0,
  };
}

function getMarketItems(data) {
  return [
    ...(data?.gold || []),
    ...(data?.currency || []),
    ...(data?.cryptocurrency || []),
  ].filter(
    (item) =>
      Number.isFinite(Number(item.price)) &&
      Number.isFinite(Number(item.change_percent)),
  );
}

function findHighestChange(items) {
  if (!items.length) {
    return null;
  }

  return items.reduce((result, item) => {
    if (
      !result ||
      Number(item.change_percent) > Number(result.change_percent)
    ) {
      return item;
    }

    return result;
  }, null);
}

function findLowestChange(items) {
  if (!items.length) {
    return null;
  }

  return items.reduce((result, item) => {
    if (
      !result ||
      Number(item.change_percent) < Number(result.change_percent)
    ) {
      return item;
    }

    return result;
  }, null);
}

function buildMarketContext(data, history) {
  const gold18 = getItem(data?.gold, "IR_GOLD_18K");

  const emami = getItem(data?.gold, "IR_COIN_EMAMI");

  const usd = getItem(data?.currency, "USD");

  const marketItems = getMarketItems(data);

  const highest = findHighestChange(marketItems);

  const lowest = findLowestChange(marketItems);

  return {
    current: {
      gold18: createMarketItem(gold18),

      emami: createMarketItem(emami),

      usd: createMarketItem(usd),

      highestChange: highest
        ? {
            name: highest.name || "",
            price: Number(highest.price),
            changePercent: Number(highest.change_percent),
          }
        : null,

      lowestChange: lowest
        ? {
            name: lowest.name || "",
            price: Number(lowest.price),
            changePercent: Number(lowest.change_percent),
          }
        : null,
    },

    history: {
      gold18: getHistoryPrices(history, "IR_GOLD_18K"),

      emami: getHistoryPrices(history, "IR_COIN_EMAMI"),

      usd: getHistoryPrices(history, "USD"),
    },
  };
}

function buildPrompt(data, history) {
  const context = buildMarketContext(data, history);

  return `
داده‌های واقعی بازار و تاریخچه کوتاه‌مدت قیمت‌ها در اختیار تو قرار گرفته است.

داده بازار:
${JSON.stringify(context, null, 2)}

بر اساس داده‌های بالا یک تحلیل کوتاه، دقیق و کاربردی از وضعیت بازار ارائه کن.

قوانین تحلیل:

- فقط از داده‌های ارائه‌شده استفاده کن.
- هیچ قیمت، درصد یا اطلاعاتی را حدس نزن.
- هیچ عددی را از خودت تولید نکن.
- قیمت‌های فعلی را فقط از بخش current استخراج کن.
- روند کوتاه‌مدت را فقط با مقایسه داده‌های history بررسی کن.
- برای طلا، سکه و دلار تحلیل جداگانه ارائه کن.
- اگر داده تاریخی کافی نیست، صریحاً بگو که اطلاعات کافی برای تشخیص روند وجود ندارد.
- از نتیجه‌گیری قطعی درباره آینده بازار خودداری کن.
- بین «روند فعلی» و «پیش‌بینی آینده» تفاوت قائل شو.
- اگر داده‌ها نوسانی هستند، آن را نوسانی توصیف کن.
- از ارائه توصیه قطعی خرید یا فروش خودداری کن.
- تحلیل باید فارسی، روان و قابل فهم برای کاربر عمومی باشد.
- حداکثر حدود 300 کلمه باشد.
- از ایموجی‌های مناسب استفاده کن.
- از جدول استفاده نکن.
- قیمت‌ها را با همان واحد داده‌شده نمایش بده.

ساختار پاسخ:

🤖 تحلیل هوشمند بازار

📊 وضعیت کلی:
یک جمع‌بندی کوتاه از وضعیت فعلی بازار ارائه کن.

🥇 طلا:
قیمت فعلی و روند کوتاه‌مدت طلای ۱۸ عیار را بررسی کن.

🪙 سکه:
قیمت فعلی و روند کوتاه‌مدت سکه امامی را بررسی کن.

💵 دلار:
قیمت فعلی و روند کوتاه‌مدت دلار را بررسی کن.

📈 روند کوتاه‌مدت:
مشخص کن هرکدام از طلا، سکه و دلار در داده‌های موجود صعودی، نزولی یا نوسانی هستند.

🔎 جمع‌بندی:
مهم‌ترین نکته قابل برداشت از داده‌های فعلی را کوتاه بیان کن.

در پایان دقیقاً این جمله را اضافه کن:

⚠️ این تحلیل صرفاً اطلاعاتی است و توصیه خرید یا فروش نیست.
`;
}

function extractAIContent(data) {
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("AI response is empty");
  }

  return content.trim();
}

function getAIErrorMessage(error) {
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }

  if (error.response?.data?.error) {
    return JSON.stringify(error.response.data.error);
  }

  if (error.code === "ECONNABORTED") {
    return "AI request timeout";
  }

  return error.message;
}

async function analyzeMarket(data, history = []) {
  if (!openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  if (!data) {
    throw new Error("Market data is unavailable");
  }

  const prompt = buildPrompt(data, history);

  try {
    const response = await axios.post(
      openRouterApiUrl,
      {
        model: openRouterModel,

        messages: [
          {
            role: "system",
            content:
              "تو یک تحلیلگر بازار هستی. فقط داده‌های واقعی ارائه‌شده توسط سیستم را تفسیر کن. هرگز قیمت، درصد، روند یا اطلاعاتی را که در داده وجود ندارد اختراع نکن. اگر داده کافی نیست، صریحاً اعلام کن.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.2,
        max_tokens: 900,
      },
      {
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Bale Market Bot",
        },

        timeout: 30000,
      },
    );

    return extractAIContent(response.data);
  } catch (error) {
    const message = getAIErrorMessage(error);

    console.error("AI analysis error:", message);

    throw new Error(`AI analysis failed: ${message}`);
  }
}

module.exports = {
  analyzeMarket,
};
