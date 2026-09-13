const axios = require("axios");
const { brsApiKey, brsApiUrl } = require("../config");

async function getMarketData() {
  const response = await axios.get(brsApiUrl, {
    params: {
      key: brsApiKey,
    },
    timeout: 10000,
  });

  if (!response.data) {
    throw new Error("Market data is empty");
  }

  return response.data;
}

function findItem(items, symbol) {
  return items?.find((item) => item.symbol === symbol) || null;
}

function getTrackedItems(data) {
  return {
    gold18: findItem(data.gold, "IR_GOLD_18K"),
    emami: findItem(data.gold, "IR_COIN_EMAMI"),
    usd: findItem(data.currency, "USD"),
  };
}

function getItemBySymbol(data, symbol) {
  return (
    findItem(data.gold, symbol) ||
    findItem(data.currency, symbol) ||
    findItem(data.cryptocurrency, symbol) ||
    null
  );
}

module.exports = {
  getMarketData,
  findItem,
  getTrackedItems,
  getItemBySymbol,
};
