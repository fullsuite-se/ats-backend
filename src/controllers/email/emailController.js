const pool = require("../../config/db");
const { v4: uuidv4 } = require("uuid");
const createTransporter = require("../../config/transporter");
const { da } = require("date-fns/locale");

const getApplicantInfo = async (applicant_id) => {
    const sql = `
            SELECT 
                a.applicant_id,
                a.first_name AS applicant_first_name,
                a.middle_name AS applicant_middle_name,
                a.last_name AS applicant_last_name,
                a.gender,
                a.birth_date,
                a.discovered_at,
                a.cv_link,
                c.mobile_number_1,
                c.mobile_number_2,
                c.email_1,
                c.email_2,
                c.email_3
            FROM ats_applicants a
            JOIN ats_contact_infos c ON a.contact_id = c.contact_id
            WHERE a.applicant_id = ?;
    `;

    const [results] = await pool.execute(sql, [applicant_id]);
    return results[0];
}

const getUserInfo = async (user_id) => {
    try {
        const sql = `
            SELECT
                a.*,
                i.*,
                c.app_password
            FROM hris_user_accounts a
            INNER JOIN hris_user_infos i ON a.user_id = i.user_id
            INNER JOIN ats_smtp_credentials c ON i.user_id = c.user_id
            WHERE a.user_id = ?;
        `;

        const [results] = await pool.execute(sql, [user_id]);
        return results[0];
    } catch (error) {
        console.log(error.message);
        return [];

    }

}

const emailSignature = (userData) => {
    // This returns formatted HTML data for the footer. 
    const fullName = `${userData.first_name} ${userData.last_name}`;
    const jobTitle = "HR Representative"; // Assuming title since it's not in data
    const companyName = "Example Inc.";
    const companyWebsite = "https://example.com";
    const contactNumber = userData.contact_number ? `📞 ${userData.contact_number}` : "";
    const email = userData.personal_email ? `✉️ <a href="mailto:${userData.personal_email}" style="color: #007bff;">${userData.personal_email}</a>` : "";
    const brandLogo = "https://media.licdn.com/dms/image/v2/D560BAQEDGebOpuJviQ/company-logo_200_200/company-logo_200_200/0/1690116252637/fullsuite_logo?e=2147483647&v=beta&t=o2nd-4DNYXQwJccynu5kw2Rv0tcd4yq_r8lXf_NQlak"; // Placeholder for company logo

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

        const applicantData = await getApplicantInfo(applicant_id);
        const userData = await getUserInfo(user_id);

        const recipientEmails = [applicantData.email_1, applicantData.email_2, applicantData.email_3].filter(Boolean);
        const emailSignatureString = emailSignature(userData);
        email_body = email_body + emailSignatureString;

        const attachments = req.files ? req.files.map(file => ({
            filename: file.originalname,
            content: file.buffer,
        })) : [];

        // Create mail options
        const mailOptions = {
            from: `"FullSuite" <${userData.user_email}>`,
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

exports.emailApplicantGuest = async (applicant, email_subject, email_body) => {
    // we'll use a default user. 
    // VARIABLES USED WHEN APPLIED FROM SUITELIFER'S WEBSITE. 
    const USER_ID = process.env.USER_ID;

    try {
        const userData = await getUserInfo(USER_ID);

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