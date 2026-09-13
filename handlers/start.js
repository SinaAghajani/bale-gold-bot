async function handleStart(bot, chatId) {
  const text = `
🪙 به ربات قیمت لحظه‌ای بازار خوش آمدید

در این ربات می‌توانید قیمت لحظه‌ای:

🥇 طلا
🪙 سکه
💵 ارز

و همچنین وضعیت بازار، محاسبه قیمت طلا، هشدار قیمت، تاریخچه قیمت و تحلیل هوشمند بازار را مشاهده کنید.

یکی از گزینه‌های زیر را انتخاب کنید:
`;

  const keyboard = {
    keyboard: [
      [
        { text: "🥇 قیمت طلا" },
        { text: "🪙 قیمت سکه" },
      ],
      [
        { text: "💵 قیمت ارز" },
      ],
      [
        { text: "📊 وضعیت بازار" },
      ],
      [
        { text: "🤖 تحلیل هوشمند بازار" },
      ],
      [
        { text: "🧮 محاسبه قیمت طلا" },
      ],
      [
        { text: "🔔 هشدار قیمت" },
        { text: "📅 تاریخچه قیمت" },
      ],
      [
        { text: "🔄 بروزرسانی قیمت‌ها" },
      ],
    ],
    resize_keyboard: true,
  };

  await bot.sendMessage(chatId, text, {
    reply_markup: keyboard,
  });
}

module.exports = {
  handleStart,
};