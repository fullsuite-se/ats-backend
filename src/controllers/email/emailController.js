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

//the function that actually sent the test assessment. 
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
    
                <p>Thank you for your interest in the ${applicantData.job_title} position at ${userData.company_name}.</p>
    
                <p>As part of our hiring process, we would like you to complete a short assessment to help us better understand your skills and qualifications.</p>
    
                <p>Please use the link to access and complete the assessment: <a href="${applicantData.assessment_url}">Start Assessment</a></p>
    
                <p>If you have any questions or encounter any issues, feel free to reply to this email.</p>
    
                <p>We look forward to reviewing your submission!</p>
            </div>
        `;
    
        const recipientEmails = [applicantData.email_1, applicantData.email_2, applicantData.email_3].filter(Boolean);
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
    
        return info.response; 
    } catch (error) {
        console.log("error sending email: ", error.message);
        return null; 
    }
}

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
            from: `"FullSuite" <${userData.user_email}>`,
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