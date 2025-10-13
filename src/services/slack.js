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

        return result.user;
    } catch (error) {
        console.error("Error fetching user by email:", error);
        return null;
    }
};

const splitNoteIntoChunks = (text, chunkSize = 2900) => {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
};

module.exports.messageBotInterview = async (interviewer_id, applicant_id) => {
    const user = await userModel.getUserInfo(interviewer_id);
    let applicant = await applicantModel.getApplicant(applicant_id);
    applicant = applicant[0];

    const slackUser = await getSlackUserByEmail(user.user_email);
    const userMention = slackUser ? `<@${slackUser.id}>` : `${user.first_name} ${user.last_name}`;

    const subject = `New interview was created for *${applicant.first_name} ${applicant.last_name}*`;
    const text = `${userMention}: ${subject.replace(/\*/g, '')}`;

    await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL,
        text: text,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `${userMention}: ${subject}`
                }
            }
        ],
        unfurl_links: false,
        unfurl_media: false
    });
};

// module.exports.messageBotNote = async (note, interviewer_id, applicant_id) => {
//     const user = await userModel.getUserInfo(interviewer_id);
//     let applicant = await applicantModel.getApplicant(applicant_id);
//     applicant = applicant[0];

//     const slackUser = await getSlackUserByEmail(user.user_email);
//     const userMention = slackUser ? `<@${slackUser.id}>` : `${user.first_name} ${user.last_name}`;

//     const subject = `New note was added for *${applicant.first_name} ${applicant.last_name}*`;
//     const text = `${userMention}: ${subject.replace(/\*/g, '')} ${note}`;

//     const noteChunks = splitNoteIntoChunks(note);
//     const noteBlocks = noteChunks.map(chunk => ({
//         type: "section",
//         text: {
//             type: "mrkdwn",
//             text: `>${chunk}`
//         }
//     }));

//     await app.client.chat.postMessage({
//         token: process.env.SLACK_BOT_TOKEN,
//         channel: process.env.SLACK_CHANNEL,
//         text: text,
//         blocks: [
//             {
//                 type: "section",
//                 text: {
//                     type: "mrkdwn",
//                     text: `${userMention}: ${subject}`
//                 }
//             },
//             ...noteBlocks
//         ],
//         unfurl_links: false,
//         unfurl_media: false
//     });
// };


module.exports.newApplicant = async (applicant_id) => {
    let applicant = await applicantModel.getApplicant(applicant_id);
    applicant = applicant[0];

    const subject = `A new applicant has been added: *${applicant.first_name} ${applicant.last_name}*`;
    const text = subject.replace(/\*/g, '');

    await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL_APPLICANT || "kriya-ats-applicants",
        text: text,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: subject
                }
            }
        ],
        unfurl_links: false,
        unfurl_media: false
    });
}

module.exports.messageBotNote = async (note, interviewer_id, applicant_id) => {
    const user = await userModel.getUserInfo(interviewer_id);
    let applicant = await applicantModel.getApplicant(applicant_id);
    applicant = applicant[0];

    const slackUser = await getSlackUserByEmail(user.user_email);
    const userMention = slackUser ? `<@${slackUser.id}>` : `${user.first_name} ${user.last_name}`;

    const subject = `New note was added for *${applicant.first_name} ${applicant.last_name}*`;
    const cleanedNote = note.trim().replace(/\r\n|\r|\n/g, '\n>'); // ensures all lines are blockquoted

    const formattedNote = `>${cleanedNote}`; // Prefix the first line too

    const noteChunks = splitNoteIntoChunks(formattedNote);
    const noteBlocks = noteChunks.map(chunk => ({
        type: "section",
        text: {
            type: "mrkdwn",
            text: chunk
        }
    }));

    await app.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: process.env.SLACK_CHANNEL,
        text: `${userMention}: ${subject.replace(/\*/g, '')} ${note}`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `${userMention}: ${subject}`
                }
            },
            ...noteBlocks
        ],
        unfurl_links: false,
        unfurl_media: false
    });
};
