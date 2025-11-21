const express = require("express");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// Discord webhook URL for cdewx
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1441242830742749237/MyV2FIQcf6MOg251Bkm2uA5HldKxW5v9-OxOwYNInuhPm1_miiP7XlXC_qqbllcTtL-x";

// Fyre API token for cdewx (JUST the token part)
const FYRE_TOKEN = "93a69c3a0385318df2bcecbb2fa8cb32";

/**
 * Send a message to Discord with automatic retry on rate limit (429).
 * This runs in the background and does NOT block Nightbot's response.
 */
async function sendToDiscordWithRetry(content) {
  try {
    const body = JSON.stringify({ content });

    const firstResp = await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });

    // If not rate-limited, we're done.
    if (firstResp.status !== 429) {
      if (!firstResp.ok) {
        console.error(
          "Discord webhook error:",
          firstResp.status,
          await firstResp.text().catch(() => "")
        );
      }
      return;
    }

    // If rate-limited, parse retry_after and try once more.
    let retryAfterMs = 2000; // default 2 seconds
    try {
      const data = await firstResp.json();
      if (data && typeof data.retry_after === "number") {
        retryAfterMs = data.retry_after * 1000;
      }
    } catch (e) {
      // ignore JSON parse errors, keep default retry
    }

    console.warn(`Discord rate-limited. Retrying in ${retryAfterMs}ms...`);

    setTimeout(async () => {
      try {
        const retryResp = await fetch(DISCORD_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body
        });

        if (!retryResp.ok) {
          console.error(
            "Discord webhook retry failed:",
            retryResp.status,
            await retryResp.text().catch(() => "")
          );
        }
      } catch (err) {
        console.error("Error on Discord webhook retry:", err);
      }
    }, retryAfterMs);
  } catch (err) {
    console.error("Error sending to Discord:", err);
  }
}

// Route Nightbot (and your browser) calls
app.get("/clip", async (req, res) => {
  const channel = req.query.channel;

  if (!channel) {
    return res.status(400).send("Missing ?channel= parameter");
  }

  try {
    // 1) Ask Fyre to create the clip
    const fyreUrl = `https://api.thefyrewire.com/twitch/clips/create/${FYRE_TOKEN}?channel=${encodeURIComponent(channel)}`;
    const fyreResp = await fetch(fyreUrl);
    const fyreText = await fyreResp.text(); // usually includes the clip URL

    // 2) Fire-and-forget Discord send (with retry on rate limit)
    sendToDiscordWithRetry(fyreText);

    // 3) Respond immediately to Nightbot (just the clip text/URL)
    res.send(fyreText);
  } catch (error) {
    console.error("Relay error:", error);
    res.status(500).send("Error creating clip");
  }
});

app.listen(PORT, () => {
  console.log(`Relay is live on port ${PORT}`);
});
