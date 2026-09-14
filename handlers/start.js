async function handleStart(bot, chatId) {
  const text = `
🪙 به ربات هوشمند بازار خوش آمدید!

قیمت لحظه‌ای طلا، سکه و ارز را سریع و ساده بررسی کنید.

✨ امکانات ربات:

🥇 قیمت لحظه‌ای طلا
🪙 قیمت لحظه‌ای سکه
💵 قیمت لحظه‌ای ارز
📊 بررسی وضعیت بازار
🤖 تحلیل هوشمند بازار با هوش مصنوعی
🧮 محاسبه قیمت طلا
🔔 تنظیم هشدار قیمت
📅 مشاهده تاریخچه قیمت‌ها

برای شروع، یکی از گزینه‌های زیر را انتخاب کنید:
`;

  const keyboard = {
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

  await bot.sendMessage(chatId, text, {
    reply_markup: keyboard,
  });
}

module.exports = {
  handleStart,
};
