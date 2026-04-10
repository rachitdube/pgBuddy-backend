import cron from "cron";
import https from "https";

const job = new cron.CronJob("*/14 * * * *", function () {
  https
    .get(process.env.API_URL, (res) => {
      if (res.statusCode === 200) {
        console.log("✅ Keep-alive ping sent successfully");
      } else {
        console.log("⚠️ Keep-alive ping failed, status code:", res.statusCode);
      }
    })
    .on("error", (e) => console.error("❌ Keep-alive ping error:", e));
});

export default job;
