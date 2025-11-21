const express = require("express");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// Discord webhook URL (yours)
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1192588489271820288/3dEXtGTLB3cJLnnHRuc-WOz26kwJPs5PDSYgv2azG1Tm8cgGZM8JIYE6xwaCRU5dn9e3";

// Fyre API token (yours)
const FYRE_TOKEN = "1cf5dd9bc3ab5bfc7389b8babe4bd990";

// Route for Nightbot to call
app.get("/clip", async (req, res) => {
  const channel = req.query.channel;
  
  if (!channel) {
    return res.status(400).send("Missing ?channel= parameter");
  }

  try {
    // 1) Ask Fyre to create the clip
    const fyreUrl = `https://api.thefyrewire.com/twitch/clips/create/${FYRE_TOKEN}?channel=${encodeURIComponent(channel)}`;
    
    const fyreResp = await fetch(fyreUrl);
    const fyreText = await fyreResp.text();  // Fyre returns plain text
    
    // 2) Post the same message to your Discord webhook
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: fyreText }),
    });

    // 3) Send it back to Nightbot
    res.send(fyreText);

  } catch (error) {
    console.error("Relay error:", error);
    res.status(500).send("Error creating clip");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Relay is live on port ${PORT}`);
});
