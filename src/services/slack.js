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

// Format source for better readability
const formatSource = (source) => {
    if (!source) return "Unknown";
    return source
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

// Format employment history
const formatEmploymentHistory = (isFirstJob, reasonForLeaving) => {
    if (isFirstJob === true) {
        return "*First-time job seeker*";
    } else if (isFirstJob === false) {
        return reasonForLeaving 
            ? `*Experienced* | Reason for leaving: ${reasonForLeaving}`
            : "*Experienced*";
    }
    return "*Employment history not specified*";
};

// Format phone number for display
const formatPhoneNumber = (phone) => {
    if (!phone) return "Not provided";
    // If it's already formatted with country code, return as is
    if (phone.startsWith('+')) return phone;
    // If it's 09xxxxxxxxx format, make it readable
    if (phone.startsWith('09') && phone.length === 11) {
        return `+63 ${phone.slice(1, 5)} ${phone.slice(5)}`;
    }
    return phone;
};

module.exports.messageBotInterview = async (interviewer_id, applicant_id) => {
    try {
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
    } catch (error) {
        console.error("Error sending interview notification:", error);
    }
};

module.exports.newApplicant = async (applicant_id) => {
    try {
        let applicant = await applicantModel.getApplicant(applicant_id);
        
        if (!applicant || applicant.length === 0) {
            console.error("Applicant not found:", applicant_id);
            return;
        }
        
        applicant = applicant[0];

        // Remove any # prefix from channel name
        const channelName = (process.env.SLACK_CHANNEL_APPLICANT || "kriya-ats-applicants").replace(/^#/, '');
        
        const applicantName = `${applicant.first_name} ${applicant.middle_name || ''} ${applicant.last_name}`.trim();
        const positionApplied = applicant.job_title || 'Not specified';
        
        // Create detailed blocks for Slack message
        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "New Applicant Submitted"
                }
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Applicant Name:*\n${applicantName}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Position Applied:*\n${positionApplied}`
                    }
                ]
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Email:*\n${applicant.email_1 || 'Not provided'}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Phone:*\n${formatPhoneNumber(applicant.mobile_number_1)}`
                    }
                ]
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Application Source:*\n${formatSource(applicant.discovered_at || applicant.applied_source)}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Referral:*\n${applicant.referrer_name ? formatSource(applicant.referrer_name) : 'None'}`
                    }
                ]
            }
        ];

        // Add employment history section
        if (applicant.is_first_job !== undefined || applicant.reason_for_leaving) {
            blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: formatEmploymentHistory(applicant.is_first_job, applicant.reason_for_leaving)
                }
            });
        }

        // Add CV link if available
        if (applicant.cv_link) {
            blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*CV Attached:* <${applicant.cv_link}|View Resume>`
                }
            });
        }

        // Add status and action section
        blocks.push(
            {
                type: "divider"
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Status:*\n${applicant.status || 'PRE_SCREENING'}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Stage:*\n${applicant.stage || 'NEW_APPLICATION'}`
                    }
                ]
            }
        );

        // Add action buttons if FRONTEND_URL is available
        if (process.env.FRONTEND_URL) {
            blocks.push({
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "View in ATS"
                        },
                        style: "primary",
                        url: `${process.env.FRONTEND_URL}/applicant/${applicant_id}`
                    }
                ]
            });
        }

        // Fallback text for non-rich clients
        const fallbackText = `New Applicant: ${applicantName} applied for ${positionApplied}. Email: ${applicant.email_1}, Phone: ${applicant.mobile_number_1}`;

        await app.client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: channelName,
            text: fallbackText,
            blocks: blocks,
            unfurl_links: false,
            unfurl_media: false
        });

        console.log("Detailed Slack notification sent for new applicant:", applicant_id);
        
    } catch (error) {
        console.error("Error sending detailed Slack notification:", error);
        
        // Fallback to simple notification if detailed one fails
        try {
            let applicant = await applicantModel.getApplicant(applicant_id);
            if (!applicant || applicant.length === 0) return;
            
            applicant = applicant[0];
            const channelName = (process.env.SLACK_CHANNEL_APPLICANT || "kriya-ats-applicants").replace(/^#/, '');
            const subject = `A new applicant has been added: *${applicant.first_name} ${applicant.last_name}*`;
            
            await app.client.chat.postMessage({
                token: process.env.SLACK_BOT_TOKEN,
                channel: channelName,
                text: subject.replace(/\*/g, ''),
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
            
            console.log("Fallback Slack notification sent");
        } catch (fallbackError) {
            console.error("Fallback notification also failed:", fallbackError);
        }
    }
};

module.exports.messageBotNote = async (note, interviewer_id, applicant_id) => {
    try {
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
    } catch (error) {
        console.error("Error sending note notification:", error);
    }
};

// Additional function for applicant status updates
module.exports.applicantStatusUpdate = async (applicant_id, oldStatus, newStatus, updatedBy) => {
    try {
        let applicant = await applicantModel.getApplicant(applicant_id);
        if (!applicant || applicant.length === 0) return;
        
        applicant = applicant[0];

        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "Applicant Status Updated"
                }
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Applicant:*\n${applicant.first_name} ${applicant.last_name}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Position:*\n${applicant.job_title || 'Not specified'}`
                    }
                ]
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Previous Status:*\n${oldStatus}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*New Status:*\n${newStatus}`
                    }
                ]
            }
        ];

        if (process.env.FRONTEND_URL) {
            blocks.push({
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "View Applicant"
                        },
                        style: "primary",
                        url: `${process.env.FRONTEND_URL}/applicant/${applicant_id}`
                    }
                ]
            });
        }

        const fallbackText = `Status updated for ${applicant.first_name} ${applicant.last_name}: ${oldStatus} → ${newStatus}`;

        await app.client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: process.env.SLACK_CHANNEL_APPLICANT || "kriya-ats-applicants",
            text: fallbackText,
            blocks: blocks,
            unfurl_links: false,
            unfurl_media: false
        });

        console.log("Status update notification sent for applicant:", applicant_id);
    } catch (error) {
        console.error("Error sending status update notification:", error);
    }
};

// Function for test completion notifications
module.exports.testCompleted = async (applicant_id, testResult) => {
    try {
        let applicant = await applicantModel.getApplicant(applicant_id);
        if (!applicant || applicant.length === 0) return;
        
        applicant = applicant[0];

        const resultText = testResult && testResult.passed ? "Passed" : "Not Passed";

        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "Test Assessment Completed"
                }
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Applicant:*\n${applicant.first_name} ${applicant.last_name}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Position:*\n${applicant.job_title || 'Not specified'}`
                    }
                ]
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*Test Result:*\n${resultText}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*Score:*\n${testResult && testResult.score ? testResult.score + '%' : 'N/A'}`
                    }
                ]
            }
        ];

        if (process.env.FRONTEND_URL) {
            blocks.push({
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "Review Results"
                        },
                        style: "primary",
                        url: `${process.env.FRONTEND_URL}/applicant/${applicant_id}`
                    }
                ]
            });
        }

        const fallbackText = `Test completed for ${applicant.first_name} ${applicant.last_name}: ${resultText}`;

        await app.client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: process.env.SLACK_CHANNEL_APPLICANT || "kriya-ats-applicants",
            text: fallbackText,
            blocks: blocks,
            unfurl_links: false,
            unfurl_media: false
        });

        console.log("Test completion notification sent for applicant:", applicant_id);
    } catch (error) {
        console.error("Error sending test completion notification:", error);
    }
};