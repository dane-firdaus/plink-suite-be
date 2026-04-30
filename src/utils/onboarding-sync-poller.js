const models = require("../models");
const { isOnboardingSyncConfigured } = require("../models/plink-desk/onboarding-shared");

let pollerStarted = false;

const startOnboardingSyncPolling = () => {
  const enabled = String(process.env.PLINK_DESK_ONBOARDING_POLLING_ENABLED || "").toLowerCase() === "true";

  if (!enabled || pollerStarted || !isOnboardingSyncConfigured()) {
    return;
  }

  const intervalMs = Math.max(
    Number(process.env.PLINK_DESK_ONBOARDING_POLLING_INTERVAL_MS) || 300000,
    60000
  );

  const runSync = async () => {
    try {
      const result = await models.syncOnboardingRecords();
      console.log(
        `[OnBoarding Sync] inserted=${result.inserted} updated=${result.updated} skipped=${result.skipped}`
      );
    } catch (error) {
      console.error("[OnBoarding Sync] polling failed:", error.message);
    }
  };

  pollerStarted = true;
  runSync();
  setInterval(runSync, intervalMs);
};

module.exports = {
  startOnboardingSyncPolling,
};
