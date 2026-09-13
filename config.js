require("dotenv").config();

const config = {
  baleToken: process.env.BALE_BOT_TOKEN,
  brsApiKey: process.env.BRS_API_KEY,
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterApiUrl: "https://openrouter.ai/api/v1/chat/completions",
  openRouterModel: process.env.OPENROUTER_MODEL || "openrouter/free",
  baleApiUrl: "https://tapi.bale.ai/bot",
  brsApiUrl: "https://api.brsapi.ir/Market/Gold_Currency.php",
};

console.log("BRS API URL:", config.brsApiUrl);
console.log("BRS API KEY:", config.brsApiKey ? "Loaded" : "Missing");
console.log("BALE TOKEN:", config.baleToken ? "Loaded" : "Missing");
console.log(
  "OPENROUTER API KEY:",
  config.openRouterApiKey ? "Loaded" : "Missing",
);
console.log("OPENROUTER MODEL:", config.openRouterModel);

if (!config.baleToken) {
  throw new Error("BALE_BOT_TOKEN is not defined in .env");
}

if (!config.brsApiKey) {
  throw new Error("BRS_API_KEY is not defined in .env");
}

if (!config.openRouterApiKey) {
  throw new Error("OPENROUTER_API_KEY is not defined in .env");
}

module.exports = config;
