const { App } = require("@slack/bolt");
require("dotenv").config();
const userModel = require("../models/user/userModel");
const applicantModel = require("../models/applicant/applicantModel");

const app = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_BOT_TOKEN,
});

const getSlackUserByEmail = async (email) => {
    try {
        const result = await app.client.users.lookupByEmail({
            token: process.env.SLACK_BOT_TOKEN,
            email,
        });

        return result.user; // full user info, including ID
    } catch (error) {
        console.error("Error fetching user by email:", error);
        return null;
    }
};

module.exports.messageBotInterview = async (interviewer_id, applicant_id) => {
    const user = await userModel.getUserInfo(interviewer_id);
    let applicant = await applicantModel.getApplicant(applicant_id);
    applicant = applicant[0];

    // Get the Slack user ID using email
    const slackUser = await getSlackUserByEmail(user.user_email);
    const userMention = slackUser ? `<@${slackUser.id}>` : `${user.first_name} ${user.last_name}`;

    const subject = "New Interview Created";
    const messageBody = `New interview was created for ${applicant.first_name} ${applicant.last_name}`;

    const text = `${userMention}: ${subject}\n${messageBody}`;

    await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL,
        text: text,
        // Using blocks for more structured message with mention
        blocks: [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `${userMention}: *${subject}*`
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": messageBody
                }
            }
        ],
    });
};

module.exports.messageBotNote = async (note, interviewer_id, applicant_id) => {
    const user = await userModel.getUserInfo(interviewer_id);
    let applicant = await applicantModel.getApplicant(applicant_id);
    applicant = applicant[0];

    // Get the Slack user ID using email
    const slackUser = await getSlackUserByEmail(user.user_email);
    const userMention = slackUser ? `<@${slackUser.id}>` : `${user.first_name} ${user.last_name}`;

    const subject = "New Note Added";
    const messageBody = `New note was added for ${applicant.first_name} ${applicant.last_name}: ${note}`;

    const text = `${userMention}: ${subject}\n${messageBody}`;

    await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL,
        text: text,
        // Using blocks for more structured message with mention
        blocks: [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `${userMention}: *${subject}*`
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": messageBody
                }
            }
        ],
    });
};