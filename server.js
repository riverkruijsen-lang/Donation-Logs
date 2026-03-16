const express = require("express");
const axios = require("axios");
const FormData = require("form-data");
const { chromium } = require("playwright");

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;
const DONATION_SECRET = process.env.DONATION_SECRET;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const WEBHOOK_USERNAME = process.env.WEBHOOK_USERNAME || "Quantum's Utilities";
const WEBHOOK_AVATAR_URL = process.env.WEBHOOK_AVATAR_URL || "";

function formatNumber(num) {
  return Number(num).toLocaleString("en-US");
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(unix) {
  const d = new Date(unix * 1000);

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = String(d.getFullYear()).slice(-2);

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${month}/${day}/${year}, ${hours}:${minutes} ${ampm}`;
}

function getVisualTier(amount) {
  if (amount === 1) {
    return {
      accent: "#3eff30",
      amountColor: "#1cff00",
      glow: "rgba(62,255,48,0.55)",
      lineGlow: "rgba(62,255,48,0.35)",
      cardGradient: "none",
      amountShadow: `
        -2px 0 #0d0d0f,
        2px 0 #0d0d0f,
        0 -2px #0d0d0f,
        0 2px #0d0d0f,
        0 0 12px rgba(62,255,48,0.35)
      `
    };
  }

  if (amount >= 2 && amount <= 9) {
    return {
      accent: "#ff9d00",
      amountColor: "#ff9d00",
      glow: "rgba(255,157,0,0.55)",
      lineGlow: "rgba(255,157,0,0.35)",
      cardGradient: "none",
      amountShadow: `
        -2px 0 #0d0d0f,
        2px 0 #0d0d0f,
        0 -2px #0d0d0f,
        0 2px #0d0d0f,
        0 0 12px rgba(255,157,0,0.35)
      `
    };
  }

  if (amount >= 10 && amount <= 99) {
    return {
      accent: "#16d8ff",
      amountColor: "#16d8ff",
      glow: "rgba(22,216,255,0.55)",
      lineGlow: "rgba(22,216,255,0.35)",
      cardGradient: "none",
      amountShadow: `
        -2px 0 #0d0d0f,
        2px 0 #0d0d0f,
        0 -2px #0d0d0f,
        0 2px #0d0d0f,
        0 0 12px rgba(22,216,255,0.35)
      `
    };
  }

  if (amount >= 100 && amount <= 999) {
    return {
      accent: "#ff19ff",
      amountColor: "#ff19ff",
      glow: "rgba(255,25,255,0.55)",
      lineGlow: "rgba(255,25,255,0.35)",
      cardGradient: "none",
      amountShadow: `
        -2px 0 #0d0d0f,
        2px 0 #0d0d0f,
        0 -2px #0d0d0f,
        0 2px #0d0d0f,
        0 0 12px rgba(255,25,255,0.35)
      `
    };
  }

  if (amount >= 1000 && amount <= 9999) {
    return {
      accent: "#ff2d8d",
      amountColor: "#ff8b00",
      glow: "rgba(255,139,0,0.55)",
      lineGlow: "rgba(255,45,141,0.35)",
      cardGradient: "none",
      amountShadow: `
        -2px 0 #0d0d0f,
        2px 0 #0d0d0f,
        0 -2px #0d0d0f,
        0 2px #0d0d0f,
        0 0 12px rgba(255,139,0,0.35)
      `
    };
  }

  if (amount >= 10000 && amount <= 99999) {
    return {
      accent: "#19d8ff",
      amountColor: "#19d8ff",
      glow: "rgba(25,216,255,0.55)",
      lineGlow: "rgba(25,216,255,0.35)",
      cardGradient: "none",
      amountShadow: `
        -2px 0 #0d0d0f,
        2px 0 #0d0d0f,
        0 -2px #0d0d0f,
        0 2px #0d0d0f,
        0 0 12px rgba(25,216,255,0.35)
      `
    };
  }

  if (amount >= 100000 && amount <= 999999) {
    return {
      accent: "#ff19ff",
      amountColor: "#ff19ff",
      glow: "rgba(255,25,255,0.55)",
      lineGlow: "rgba(255,25,255,0.35)",
      cardGradient: "none",
      amountShadow: `
        -2px 0 #0d0d0f,
        2px 0 #0d0d0f,
        0 -2px #0d0d0f,
        0 2px #0d0d0f,
        0 0 12px rgba(255,25,255,0.35)
      `
    };
  }

  if (amount >= 1000000 && amount <= 9999999) {
    return {
      accent: "#ff1d8e",
      amountColor: "#ff1d8e",
      glow: "rgba(255,29,142,0.55)",
      lineGlow: "rgba(255,29,142,0.35)",
      cardGradient: "linear-gradient(180deg, rgba(255,29,142,0.00) 0%, rgba(255,29,142,0.10) 78%, rgba(255,29,142,0.18) 100%)",
      amountShadow: `
        -2px 0 #0d0d0f,
        2px 0 #0d0d0f,
        0 -2px #0d0d0f,
        0 2px #0d0d0f,
        0 0 12px rgba(255,29,142,0.35)
      `
    };
  }

  return {
    accent: "#ff1a1a",
    amountColor: "#ff2a2a",
    glow: "rgba(255,26,26,0.60)",
    lineGlow: "rgba(255,26,26,0.45)",
    cardGradient: "linear-gradient(180deg, rgba(255,0,0,0.00) 0%, rgba(255,0,0,0.18) 55%, rgba(255,0,0,0.45) 100%)",
    amountShadow: `
      -2px 0 #0d0d0f,
      2px 0 #0d0d0f,
      0 -2px #0d0d0f,
      0 2px #0d0d0f,
      0 0 16px rgba(255,26,26,0.45)
    `
  };
}

async function resolveAvatarImage(userId) {
  if (Number(userId) === 1) {
    return "https://www.roblox.com/headshot-thumbnail/image?userId=1&width=420&height=420&format=png";
  }

  try {
    const res = await axios.get("https://thumbnails.roblox.com/v1/users/avatar-headshot", {
      params: {
        userIds: userId,
        size: "420x420",
        format: "Png",
        isCircular: false
      }
    });

    const imageUrl = res?.data?.data?.[0]?.imageUrl;
    if (imageUrl) return imageUrl;
  } catch (e) {}

  return `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`;
}

async function generateDonationImage(data) {
  const tier = getVisualTier(data.amount);
  const donorAvatar = await resolveAvatarImage(data.donorId);
  const receiverAvatar = await resolveAvatarImage(data.receiverId);

  const donorName = escapeHtml("@" + data.donorName);
  const receiverName = escapeHtml("@" + data.receiverName);
  const amountText = escapeHtml(formatNumber(data.amount));
  const dateText = escapeHtml(formatDate(data.timestamp));

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        width: 575px;
        height: 173px;
        background: #1e1f22;
        font-family: Arial, Helvetica, sans-serif;
      }

      .canvas {
        position: relative;
        width: 575px;
        height: 173px;
        background: #1e1f22;
      }

      .left-bar {
        position: absolute;
        left: 16px;
        top: 14px;
        width: 5px;
        height: 145px;
        border-radius: 3px;
        background: ${tier.accent};
        box-shadow: 0 0 8px ${tier.lineGlow};
      }

      .card {
        position: absolute;
        left: 31px;
        top: 14px;
        width: 544px;
        height: 145px;
        background: #2b2d31;
        border: 1px solid #3a3d45;
        border-radius: 4px;
        overflow: hidden;
      }

      .card-gradient {
        position: absolute;
        inset: 0;
        background: ${tier.cardGradient};
      }

      .inner-line {
        position: absolute;
        left: 28px;
        right: 28px;
        bottom: 28px;
        height: 16px;
        border-radius: 3px;
        background: linear-gradient(
          90deg,
          rgba(0,0,0,0) 0%,
          ${tier.lineGlow} 50%,
          rgba(0,0,0,0) 100%
        );
        opacity: ${data.amount >= 1000000 ? "1" : "0"};
      }

      .avatar-block {
        position: absolute;
        width: 100px;
        text-align: center;
      }

      .donor {
        left: 48px;
        top: 35px;
      }

      .receiver {
        right: 48px;
        top: 35px;
      }

      .avatar {
        width: 66px;
        height: 66px;
        margin: 0 auto;
        border-radius: 50%;
        border: 3px solid ${tier.accent};
        object-fit: cover;
        display: block;
        background: #111;
        box-shadow: 0 0 12px ${tier.glow};
      }

      .username {
        margin-top: 7px;
        font-size: 12px;
        font-weight: 800;
        color: #ffffff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-shadow:
          -2px 0 #0d0d0f,
          2px 0 #0d0d0f,
          0 -2px #0d0d0f,
          0 2px #0d0d0f,
          0 2px 4px rgba(0,0,0,0.7);
      }

      .center {
        position: absolute;
        left: 50%;
        top: 42px;
        transform: translateX(-50%);
        width: 220px;
        text-align: center;
      }

      .amount {
        font-size: 23px;
        font-weight: 900;
        color: ${tier.amountColor};
        line-height: 1;
        letter-spacing: 0.2px;
        text-shadow: ${tier.amountShadow};
      }

      .donated-to {
        margin-top: 2px;
        font-size: 17px;
        font-weight: 900;
        color: white;
        line-height: 1.05;
        text-shadow:
          -2px 0 #0d0d0f,
          2px 0 #0d0d0f,
          0 -2px #0d0d0f,
          0 2px #0d0d0f,
          0 2px 4px rgba(0,0,0,0.7);
      }

      .date {
        position: absolute;
        left: 30px;
        bottom: 15px;
        font-size: 13px;
        font-weight: 700;
        color: #ffffff;
      }

      .robux-icon {
        display: inline-block;
        color: ${tier.amountColor};
        margin-right: 5px;
        text-shadow: ${tier.amountShadow};
      }
    </style>
  </head>
  <body>
    <div class="canvas">
      <div class="left-bar"></div>

      <div class="card">
        <div class="card-gradient"></div>
        <div class="inner-line"></div>

        <div class="avatar-block donor">
          <img class="avatar" src="${donorAvatar}">
          <div class="username">${donorName}</div>
        </div>

        <div class="center">
          <div class="amount"><span class="robux-icon">◉</span>${amountText}</div>
          <div class="donated-to">donated to</div>
        </div>

        <div class="avatar-block receiver">
          <img class="avatar" src="${receiverAvatar}">
          <div class="username">${receiverName}</div>
        </div>

        <div class="date">Donated on • ${dateText}</div>
      </div>
    </div>
  </body>
  </html>
  `;

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage({
      viewport: {
        width: 575,
        height: 173
      },
      deviceScaleFactor: 1
    });

    await page.setContent(html, { waitUntil: "networkidle" });
    const screenshot = await page.screenshot({
      type: "png"
    });

    return screenshot;
  } finally {
    await browser.close();
  }
}

function getTopLineEmoji(amount) {
  if (amount === 1) {
    return {
      prefix: "<:958465315195465728:1387373324576755852>",
      robux: "<:1289414980239753347:1387373217274134569>"
    };
  }

  if (amount >= 2 && amount <= 9) {
    return {
      prefix: "<:958465315195465728:1387373324576755852>",
      robux: "<:1289414980239753347:1387373217274134569>"
    };
  }

  if (amount >= 10 && amount <= 99) {
    return {
      prefix: "<:1289415023139229757:1387373221115858996>",
      robux: "<:1289414980239753347:1387373217274134569>"
    };
  }

  if (amount >= 100 && amount <= 999) {
    return {
      prefix: "<:1349113948594503700:1387373269602275472>",
      robux: "<:1289414980239753347:1387373217274134569>"
    };
  }

  if (amount >= 1000 && amount <= 9999) {
    return {
      prefix: "<:1349113943158947911:1397937355855368255>",
      robux: "<:1289414980239753347:1387373217274134569>"
    };
  }

  if (amount >= 10000 && amount <= 999999999) {
    return {
      prefix: "<:1349113922480767116:1387373262312308849>",
      robux: "<:1289414980239753347:1387373217274134569>"
    };
  }

  return {
    prefix: "<:1349113922480767116:1387373262312308849>",
    robux: "<:1289414980239753347:1387373217274134569>"
  };
}

function getTopLine(data) {
  const donor = `@${data.donorName}`;
  const receiver = `@${data.receiverName}`;
  const amount = formatNumber(data.amount);

  const emojis = getTopLineEmoji(data.amount);

  return `${emojis.prefix} ${donor} donated ${emojis.robux} ${amount} Robux to ${receiver}`;
}

async function sendDiscordWebhook(data, imageBuffer) {
  const form = new FormData();

  const payload = {
    username: WEBHOOK_USERNAME,
    embeds: [
      {
        color: 0x2b2d31,
        description: getTopLine(data),
        image: {
          url: "attachment://donation.png"
        }
      }
    ]
  };

  if (WEBHOOK_AVATAR_URL) {
    payload.avatar_url = WEBHOOK_AVATAR_URL;
  }

  form.append("payload_json", JSON.stringify(payload));
  form.append("file", imageBuffer, {
    filename: "donation.png",
    contentType: "image/png"
  });

  await axios.post(DISCORD_WEBHOOK_URL, form, {
    headers: form.getHeaders()
  });
}

app.get("/", (req, res) => {
  res.send("Donation logger is running.");
});

app.post("/api/donation", async (req, res) => {
  try {
    const secret = req.headers["x-donation-secret"];
    if (!DONATION_SECRET || secret !== DONATION_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      donorId,
      donorName,
      donorDisplayName,
      receiverId,
      receiverName,
      receiverDisplayName,
      amount,
      timestamp,
      yellow,
      level
    } = req.body;

    if (
      donorId === undefined ||
      !donorName ||
      receiverId === undefined ||
      !receiverName ||
      amount === undefined ||
      timestamp === undefined
    ) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const safeData = {
      donorId: Number(donorId),
      donorName: String(donorName).replace(/^@+/, ""),
      donorDisplayName: donorDisplayName ? String(donorDisplayName) : "",
      receiverId: Number(receiverId),
      receiverName: String(receiverName).replace(/^@+/, ""),
      receiverDisplayName: receiverDisplayName ? String(receiverDisplayName) : "",
      amount: Number(amount),
      timestamp: Number(timestamp),
      yellow: !!yellow,
      level: Number(level || 0)
    };

    const imageBuffer = await generateDonationImage(safeData);
    await sendDiscordWebhook(safeData, imageBuffer);

    return res.json({ success: true });
  } catch (error) {
    console.error("Donation logger error:", error?.response?.data || error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Donation logger listening on port ${PORT}`);
});
