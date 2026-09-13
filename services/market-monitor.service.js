const { getMarketData } = require("./market.service");
const { addMarketSnapshot } = require("./history.service");
const { checkAlerts } = require("./alert.service");

let monitorInterval = null;
let isRunning = false;

async function updateMarket(bot) {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    const data = await getMarketData();

    addMarketSnapshot(data);

    await checkAlerts(bot, data);

  } catch (error) {
    console.error(
      "Market monitor error:",
      error.response?.data || error.message,
    );
  } finally {
    isRunning = false;
  }
}

function startMarketMonitor(bot, interval = 60000) {
  if (monitorInterval) {
    return;
  }

  updateMarket(bot);

  monitorInterval = setInterval(() => {
    updateMarket(bot);
  }, interval);
}

function stopMarketMonitor() {
  if (!monitorInterval) {
    return;
  }

  clearInterval(monitorInterval);
  monitorInterval = null;

}

module.exports = {
  startMarketMonitor,
  stopMarketMonitor,
  updateMarket,
};
