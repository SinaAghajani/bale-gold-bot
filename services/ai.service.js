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
  return history
    .filter((record) => record.symbol === symbol)
    .slice(0, 10)
    .reverse()
    .map((record) => ({
      price: record.price,
      changePercent: record.changePercent,
      date: record.date,
      time: record.time,
    }));
}

function buildMarketContext(data, history) {
  const gold18 = getItem(data.gold, "IR_GOLD_18K");
  const emami = getItem(data.gold, "IR_COIN_EMAMI");
  const usd = getItem(data.currency, "USD");

  const marketItems = [...(data.gold || []), ...(data.currency || [])].filter(
    (item) =>
      typeof item.price === "number" && typeof item.change_percent === "number",
  );

  const highest = marketItems.reduce((result, item) => {
    if (!result || item.change_percent > result.change_percent) {
      return item;
    }

    return result;
  }, null);

  const lowest = marketItems.reduce((result, item) => {
    if (!result || item.change_percent < result.change_percent) {
      return item;
    }

    return result;
  }, null);

  return {
    current: {
      gold18: gold18
        ? {
            name: gold18.name,
            price: gold18.price,
            unit: gold18.unit,
            changeValue: gold18.change_value,
            changePercent: gold18.change_percent,
          }
        : null,

      emami: emami
        ? {
            name: emami.name,
            price: emami.price,
            unit: emami.unit,
            changeValue: emami.change_value,
            changePercent: emami.change_percent,
          }
        : null,

      usd: usd
        ? {
            name: usd.name,
            price: usd.price,
            unit: usd.unit,
            changeValue: usd.change_value,
            changePercent: usd.change_percent,
          }
        : null,

      highestChange: highest
        ? {
            name: highest.name,
            price: highest.price,
            changePercent: highest.change_percent,
          }
        : null,

      lowestChange: lowest
        ? {
            name: lowest.name,
            price: lowest.price,
            changePercent: lowest.change_percent,
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

بر اساس این داده‌ها یک تحلیل کوتاه و کاربردی از وضعیت بازار ارائه کن.

قوانین تحلیل:

- فقط از اطلاعات موجود در داده استفاده کن.
- هیچ قیمت یا درصدی را حدس نزن.
- هیچ اطلاعاتی را از خودت اضافه نکن.
- قیمت فعلی را از بخش current بررسی کن.
- روند کوتاه‌مدت را با مقایسه داده‌های history بررسی کن.
- برای طلا، سکه و دلار جداگانه تحلیل ارائه کن.
- اگر تعداد داده‌های تاریخی کم است، ادعای قطعی درباره روند نداشته باش.
- اگر داده تاریخی کافی نیست، صریحاً اعلام کن که برای تشخیص روند اطلاعات بیشتری لازم است.
- تغییرات صعودی و نزولی را با دقت تفسیر کن.
- از ارائه توصیه قطعی خرید یا فروش خودداری کن.
- تحلیل باید فارسی و روان باشد.
- حداکثر حدود 300 کلمه باشد.
- از ایموجی مناسب استفاده کن.

ساختار پاسخ:

🤖 تحلیل هوشمند بازار

📊 وضعیت کلی:
یک جمع‌بندی کوتاه از وضعیت فعلی بازار و روند کلی ارائه کن.

🥇 طلا:
قیمت فعلی و روند کوتاه‌مدت طلای ۱۸ عیار را تحلیل کن.

🪙 سکه:
قیمت فعلی و روند کوتاه‌مدت سکه امامی را تحلیل کن.

💵 دلار:
قیمت فعلی و روند کوتاه‌مدت دلار را تحلیل کن.

📈 روند کوتاه‌مدت:
مشخص کن کدام دارایی روند صعودی، نزولی یا نوسانی دارد.

🔎 جمع‌بندی:
یک جمع‌بندی کوتاه از مهم‌ترین نکته بازار ارائه کن.

در پایان دقیقاً این جمله را اضافه کن:

⚠️ این تحلیل صرفاً اطلاعاتی است و توصیه خرید یا فروش نیست.
`;
}

async function analyzeMarket(data, history = []) {
  if (!openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const prompt = buildPrompt(data, history);

  const response = await axios.post(
    openRouterApiUrl,
    {
      model: openRouterModel,
      messages: [
        {
          role: "system",
          content:
            "تو یک تحلیلگر بازار هستی که فقط داده‌های واقعی ارائه‌شده را تفسیر می‌کنی و هرگز اطلاعات یا اعداد جدید اختراع نمی‌کنی.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
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

  const content = response.data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("AI response is empty");
  }

  return content.trim();
}

module.exports = {
  analyzeMarket,
};
