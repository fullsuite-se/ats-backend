const pool = require("../../config/db");
const { v4: uuidv4 } = require("uuid");
const createTransporter = require("../../config/transporter");
const { da } = require("date-fns/locale");
const applicantModel = require("../../models/applicant//applicantModel");
const userModel = require("../../models/user/userModel");

const emailSignature = (userData) => {
    console.log('userdata: ', userData);
    // This returns formatted HTML data for the footer. 
    const fullName = `${userData.first_name} ${userData.last_name}`;
    const jobTitle = userData.job_title; // Assuming title since it's not in data
    const companyName = userData.company_name;
    const companyWebsite = `https://${userData.company_name}.com`;
    const contactNumber = userData.contact_number ? `📞 ${userData.contact_number}` : "";
    const email = userData.user_email ? `✉️ <a href="mailto:${userData.user_email}" style="color: #007bff;">${userData.user_email}</a>` : "";
    const brandLogo = userData.company_logo;

    return `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 10px; border-top: 2px solid #007bff;">
            <div style="display: flex; align-items: center;">
                <img src="${brandLogo}" alt="Company Logo" width="80" height="80" style="border-radius: 10px; margin-right: 15px;">
                <div>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>${fullName}</strong></p>
                    <p style="margin: 5px 0; font-size: 14px;">${jobTitle} | <a href="${companyWebsite}" style="color: #007bff; text-decoration: none;">${companyName}</a></p>
                    <p style="margin: 5px 0; font-size: 14px;">${contactNumber} ${email}</p>
                    <p style="font-size: 12px; color: #777; margin-top: 10px;">Confidentiality Notice: This email and any attachments are confidential.</p>
                </div>
            </div>
        </div>
    `;
};

exports.addEmailTemplates = async (req, res) => {
    try {
        const data = req.body;
        const template_id = uuidv4();

        const sql = `
            INSERT INTO ats_email_templates (template_id, company_id, title, subject, body)
            VALUES (?, ?, ?, ?, ?);
        `;

        const values = [template_id, data.company_id, data.title, data.subject, data.body];
        await pool.execute(sql, values);
        res.status(200).json({ message: "template added" })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

exports.emailTemplates = async (req, res) => {
    try {
        const sql = `
            SELECT * 
            FROM ats_email_templates
        `;
        const [results] = await pool.execute(sql);
        res.status(200).json({ message: "fetched successfully", templates: results });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.emailApplicant = async (req, res) => {
    try {
        let { applicant_id, user_id, email_subject, email_body } = req.body;

        if (!applicant_id || !email_subject || !email_body) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        let applicantData = await applicantModel.getApplicant(applicant_id);
        applicantData = applicantData[0];
        console.log('applicant data', applicantData);

        const userData = await userModel.getUserInfo(user_id);
        console.log('user data', userData);


        const recipientEmails = [applicantData.email_1, applicantData.email_2, applicantData.email_3].filter(Boolean);
        const emailSignatureString = emailSignature(userData);
        email_body = email_body + emailSignatureString;

        const attachments = req.files ? req.files.map(file => ({
            filename: file.originalname,
            content: file.buffer,
        })) : [];

        // Create mail options
        const mailOptions = {
            from: `"${userData.company_name}" <${userData.user_email}>`,
            to: recipientEmails,
            subject: email_subject,
            html: email_body,
            attachments: attachments,

        };

        //create transporter
        const transporter = createTransporter({ email_user: userData.user_email, email_pass: userData.app_password })
        const info = await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "Email sent successfully", info: info.response });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};
// the function that actually sends the test assessment
exports.emailTestAssessment = async (applicant_id, user_id) => {
    try {
        let applicantData = await applicantModel.getApplicant(applicant_id);
        applicantData = applicantData[0];
        console.log('applicant data', applicantData);

        const userData = await userModel.getUserInfo(user_id);
        console.log('user data', userData);

        let email_subject = `Test Assessment`;
        let email_body = `
            <div>
                <p>Hi ${applicantData.first_name},</p>

                <p>We have received your application. Thank you for your recent application to join our team here at FullSuite. 
                We are excited to find out if the #suitelife is the workplace you have been searching for and if you are the next Suitelifer 
                we will be so excited about you joining our team!</p>

                <p>To kick off the evaluation process, we need you to undergo an assessment test. Rest assured, this test is not a zero-sum exercise 
                and there is no specific passing rate you need to hit to move to the next step as we take the result of this test alongside the interview 
                assessments to get a holistic review of your culture fit with FullSuite.</p>

                <p>Click the link of the test corresponding to the position you are applying for:</p>

                <p>Please use the link to access and complete the assessment: 
                <a href="${applicantData.assessment_url}">Start Assessment</a></p>

                <p>The entire test may take you between 40–80 minutes. Some candidates may find the exercise a bit too fast for comfort, 
                but our advice is that you answer each question as honestly as you can.</p>

                <p>For more information about our company and what we do, kindly visit our website here: 
                <a href="https://fullsuite.ph/">https://fullsuite.ph/</a></p>

                <p>We look forward to reviewing your completed tests and getting to know you better.</p>
            </div>
        `;

        const recipientEmails = [
            applicantData.email_1, 
            applicantData.email_2, 
            applicantData.email_3
        ].filter(Boolean);

        const emailSignatureString = emailSignature(userData);
        email_body = email_body + emailSignatureString;

        // Create mail options
        const mailOptions = {
            from: `"${userData.company_name}" <${userData.user_email}>`,
            to: recipientEmails,
            cc: "hireme@getfullsuite.com",
            bcc: userData.user_email, // ensures sender also gets inbox copy
            subject: email_subject,
            html: email_body,
        };

        // Create transporter
        const transporter = createTransporter({ 
            email_user: userData.user_email, 
            email_pass: userData.app_password 
        });
        const info = await transporter.sendMail(mailOptions);

        console.log(`✅ Email sent successfully to: ${recipientEmails.join(", ")}, CC: hireme@getfullsuite.com, BCC: ${userData.user_email}`);

        return info.response;
    } catch (error) {
        console.log("❌ Error sending email: ", error.message);
        return null;
    }
};

//endpoint that only calls the sending processes. 
exports.emailApplicantTestAssessment = async (req, res) => {
    try {
        let { applicant_id, user_id } = req.body;

        const response = emailTestAssessment(applicant_id, user_id);

        res.status(200).json({ message: "Email sent successfully", info: response });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
}

exports.notifyUsersNewApplicant = async (applicant_id) => {
    try {
        const users = await userModel.getAllUserAccounts();

        const recipientEmails = users
            .filter(user =>
                (user.service_features || []).some(
                    feature => feature.feature_name === "Receive Email"
                )
            )
            .map(user => user.user_email);

        if (recipientEmails.length === 0) {
            console.log("No recipients found for the notification.");
            return false;
        }

        const USER_ID = process.env.USER_ID;
        const [userData, applicantArray] = await Promise.all([
            userModel.getUserInfo(USER_ID),
            applicantModel.getApplicant(applicant_id)
        ]);

        const applicantData = applicantArray[0];
        console.log('applicant data', applicantData);

        const emailSubject = `📩 New Applicant for <strong>${applicantData.job_title}</strong> Position`;

        const emailBody = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2 style="color: #2c3e50;">🚀 New Application Received</h2>
                <p>
                    A new applicant has applied for the position of 
                    <strong style="color: #2980b9;">${applicantData.job_title}</strong>.
                </p>
                <ul>
                    <li><strong>Name:</strong> ${applicantData.first_name} ${applicantData.last_name}</li>
                    <li><strong>Email:</strong> ${applicantData.email_1}</li>
                    <li><strong>Mobile:</strong> ${applicantData.mobile_number_1}</li>
                    <li><strong>CV:</strong> <a href="${applicantData.cv_link}" target="_blank">View CV</a></li>
                    <li><strong>Assessment:</strong> <a href="${applicantData.assessment_url}" target="_blank">View Assessment</a></li>
                    <li><strong>Discovered At:</strong> ${applicantData.discovered_at}</li>
                </ul>
                <hr />
                ${emailSignature(userData)}
            </div>
        `;

        const mailOptions = {
            from: `"${userData.company_name}" <${userData.user_email}>`,
            to: recipientEmails,
            subject: emailSubject.replace(/<[^>]+>/g, ""), // remove HTML for plain subject
            html: emailBody,
        };

        const transporter = createTransporter({
            email_user: userData.user_email,
            email_pass: userData.app_password
        });

        await transporter.sendMail(mailOptions);
        return true;

    } catch (error) {
        console.error("Error notifying users of new applicant:", error.message);
        return false;
    }
};


exports.emailApplicantGuest = async (applicant, email_subject, email_body) => {
    // we'll use a default user. 
    // VARIABLES USED WHEN APPLIED FROM SUITELIFER'S WEBSITE. 
    const USER_ID = process.env.USER_ID;

    try {
        const userData = await userModel.getUserInfo(USER_ID);

        const recipientEmails = [applicant.email_1];
        const emailSignatureString = emailSignature(userData);
        email_body = email_body + emailSignatureString;

        // Create mail options
        const mailOptions = {
            from: `"${userData.company_name}" <${userData.user_email}>`,
            to: recipientEmails,
            subject: email_subject,
            html: email_body,
        };

        //create transporter
        const transporter = createTransporter({ email_user: userData.user_email, email_pass: userData.app_password })
        const info = await transporter.sendMail(mailOptions);
        return true
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

exports.deleteEmailTemplate = async (req, res) => {
    try {
        const { template_id } = req.params;

        if (!template_id) {
            return res.status(400).json({ message: "Template ID is required" });
        }

        const sql = `
            DELETE FROM ats_email_templates
            WHERE template_id = ?;
        `;

        await pool.execute(sql, [template_id]);
        res.status(200).json({ message: "Template deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateEmailTemplate = async (req, res) => {
    try {
        const { template_id } = req.params;
        const { title, subject, body } = req.body;

        if (!template_id || !title || !subject || !body) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const sql = `
            UPDATE ats_email_templates
            SET title = ?, subject = ?, body = ?
            WHERE template_id = ?;
        `;

        const values = [title, subject, body, template_id];
        await pool.execute(sql, values);
        res.status(200).json({ message: "Template updated successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};