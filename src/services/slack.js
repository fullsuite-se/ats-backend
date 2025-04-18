import Slack from '@slack/bolt';
import dotenv from 'dotenv';
dotenv.config();
const userModel = require("../models/user/userModel");

const app = new Slack.App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_BOT_TOKEN,
})



const messageBot = async (message, user_id) => {
    const user = await userModel.getUserInfo(user_id);

    const text = `${user.first_name} ${user.last_name}: ${message}`

    await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL,
        text: text,
        // blocks: block,
    });
}

module.exports = sendMessageToSlack;

