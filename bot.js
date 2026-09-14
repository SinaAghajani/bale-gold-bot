const axios = require("axios");
const config = require("./config");
const { handleStart } = require("./handlers/start");
const { handleMessage } = require("./handlers/message");
const {
  startMarketMonitor,
  stopMarketMonitor,
} = require("./services/market-monitor.service");

const API_URL = `${config.baleApiUrl}${config.baleToken}`;

let offset = 0;
let isPolling = false;
let isShuttingDown = false;
let retryTimeout = null;

const POLLING_TIMEOUT = 30;
const RETRY_DELAY = 5000;

const processedUpdates = new Set();
const MAX_PROCESSED_UPDATES = 1000;

const bot = {
  async sendMessage(chatId, text, options = {}) {
    const response = await axios.post(
      `${API_URL}/sendMessage`,
      {
        chat_id: chatId,
        text,
        ...options,
      },
      {
        timeout: 15000,
      },
    );

    return response.data;
  },
};

function rememberUpdate(updateId) {
  processedUpdates.add(updateId);

  if (processedUpdates.size > MAX_PROCESSED_UPDATES) {
    const firstUpdate = processedUpdates.values().next().value;

    processedUpdates.delete(firstUpdate);
  }
}

function hasProcessedUpdate(updateId) {
  return processedUpdates.has(updateId);
}

async function processUpdate(update) {
  if (!update || typeof update.update_id !== "number") {
    return;
  }

  if (hasProcessedUpdate(update.update_id)) {
    return;
  }

  rememberUpdate(update.update_id);

  const message = update.message;

  if (!message || !message.chat) {
    return;
  }

  try {
    if (message.text === "/start") {
      await handleStart(bot, message.chat.id);
      return;
    }

    await handleMessage(bot, message);
  } catch (error) {
    console.error(
      "Update processing error:",
      error.response?.data || error.message,
    );
  }
}

async function poll() {
  if (isShuttingDown || isPolling) {
    return;
  }

  isPolling = true;

  try {
    const response = await axios.get(`${API_URL}/getUpdates`, {
      params: {
        offset,
        timeout: POLLING_TIMEOUT,
        limit: 100,
      },
      timeout: (POLLING_TIMEOUT + 10) * 1000,
    });

    if (!response.data?.ok) {
      throw new Error(
        response.data?.description || "Bale getUpdates request failed",
      );
    }

    const updates = response.data.result || [];

    for (const update of updates) {
      offset = update.update_id + 1;

      await processUpdate(update);
    }
  } catch (error) {
    console.error("Polling error:", error.response?.data || error.message);

    if (!isShuttingDown) {
      await wait(RETRY_DELAY);
    }
  } finally {
    isPolling = false;
  }

  if (!isShuttingDown) {
    setImmediate(poll);
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    retryTimeout = setTimeout(resolve, milliseconds);
  });
}

async function verifyBotConnection() {
  const response = await axios.get(`${API_URL}/getMe`, {
    timeout: 10000,
  });

  if (!response.data?.ok) {
    throw new Error(
      response.data?.description || "Unable to connect to Bale API",
    );
  }

  const botInfo = response.data.result;

  console.log(
    `Bot connected: @${botInfo.username || botInfo.first_name || "unknown"}`,
  );
}

async function startBot() {
  try {
    console.log("Starting Bale bot...");

    await verifyBotConnection();

    startMarketMonitor(bot);

    console.log("Market monitor started.");
    console.log("Bale polling started.");

    await poll();
  } catch (error) {
    console.error(
      "Failed to start bot:",
      error.response?.data || error.message,
    );

    process.exit(1);
  }
}

function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(`${signal} received. Shutting down...`);

  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }

  stopMarketMonitor();

  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

startBot();
