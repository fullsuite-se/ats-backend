import Slack from '@slack/bolt';
import dotenv from 'dotenv';
dotenv.config();

const app = new Slack.App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_BOT_TOKEN,
})



const sendMessageToSlack = async (message, user_name = null) => {
    const text = `${user_name}: ${message}`

    await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL,
        text: text,
        // blocks: block,
    });
}

module.exports = sendMessageToSlack;

