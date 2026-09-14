require("dotenv").config();

const config = {
  baleToken: process.env.BALE_BOT_TOKEN,
  baleApiUrl: "https://tapi.bale.ai/bot",

  brsApiKey: process.env.BRS_API_KEY,
  brsApiUrl: "https://api.brsapi.ir/Market/Gold_Currency.php",

  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterApiUrl: "https://openrouter.ai/api/v1/chat/completions",
  openRouterModel: process.env.OPENROUTER_MODEL || "openrouter/free",
};

function validateConfig() {
  const requiredVariables = [
    {
      name: "BALE_BOT_TOKEN",
      value: config.baleToken,
    },
    {
      name: "BRS_API_KEY",
      value: config.brsApiKey,
    },
    {
      name: "OPENROUTER_API_KEY",
      value: config.openRouterApiKey,
    },
  ];

  const missingVariables = requiredVariables
    .filter((item) => !item.value)
    .map((item) => item.name);

  if (missingVariables.length) {
    throw new Error(
      `Missing environment variables: ${missingVariables.join(", ")}`,
    );
  }
}

validateConfig();

console.log("Bale API:", config.baleApiUrl);

console.log("BRS API:", config.brsApiUrl);

console.log("BRS API KEY: Loaded");

console.log("Bale token: Loaded");

console.log("OpenRouter API KEY: Loaded");

console.log("OpenRouter model:", config.openRouterModel);

module.exports = config;
