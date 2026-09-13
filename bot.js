const axios = require("axios");
const config = require("./config");
const { handleStart } = require("./handlers/start");
const { handleMessage } = require("./handlers/message");
const { startMarketMonitor } = require("./services/market-monitor.service");

const API_URL = `${config.baleApiUrl}${config.baleToken}`;

let offset = 0;

const bot = {
  async sendMessage(chatId, text, options = {}) {
    const response = await axios.post(`${API_URL}/sendMessage`, {
      chat_id: chatId,
      text,
      ...options,
    });

    return response.data;
  },
};

async function getUpdates() {
  try {
    const response = await axios.get(`${API_URL}/getUpdates`, {
      params: {
        offset,
        timeout: 30,
      },
    });

    if (!response.data.ok) {
      console.error("Bale API error:", response.data);
      return;
    }

    const updates = response.data.result || [];

    for (const update of updates) {
      offset = update.update_id + 1;

      const message = update.message;

      if (!message || !message.chat) {
        continue;
      }

      if (message.text === "/start") {
        await handleStart(bot, message.chat.id);
        continue;
      }

      await handleMessage(bot, message);
    }
  } catch (error) {
    console.error("Bot error:", error.response?.data || error.message);
  }

  setImmediate(getUpdates);
}

async function startBot() {
  try {
    const response = await axios.get(`${API_URL}/getMe`);

    if (!response.data.ok) {
      throw new Error("Unable to connect to Bale API");
    }

    startMarketMonitor(bot);

    await getUpdates();
  } catch (error) {
    console.error(
      "Failed to start bot:",
      error.response?.data || error.message,
    );

    process.exit(1);
  }
}

startBot();
