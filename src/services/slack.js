const { App } = require("@slack/bolt");
require("dotenv").config();

const app = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_BOT_TOKEN,
})

const messageBot = async (message, user_id) => {
    const text = `${message}`

    await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL,
        text: text,
        // blocks: block,
    });
};

module.exports = messageBot; 
