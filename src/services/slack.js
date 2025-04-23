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

    const subject = `New interview was created for *${applicant.first_name} ${applicant.last_name}*`;

    // Fallback text for clients that don't support blocks
    const text = `${userMention}: ${subject.replace(/\*/g, '')}`;

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
                    "text": `${userMention}: ${subject}`
                }
            }
        ],
        unfurl_links: false,
        unfurl_media: false
    });
};

module.exports.messageBotNote = async (note, interviewer_id, applicant_id) => {
    const user = await userModel.getUserInfo(interviewer_id);
    let applicant = await applicantModel.getApplicant(applicant_id);
    applicant = applicant[0];

    // Get the Slack user ID using email
    const slackUser = await getSlackUserByEmail(user.user_email);
    const userMention = slackUser ? `<@${slackUser.id}>` : `${user.first_name} ${user.last_name}`;

    const subject = `New note was added for *${applicant.first_name} ${applicant.last_name}*`;

    // Note is already included in the subject, no need for duplicate content
    // Remove the extra asterisk that was in the original code
    await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL,
        text: `${userMention}: ${subject.replace(/\*/g, '')} ${note}`,
        blocks: [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `${userMention}: ${subject}`
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `>${note}`  // Using blockquote for the note content
                }
            }
        ],
        unfurl_links: false,
        unfurl_media: false
    });
};