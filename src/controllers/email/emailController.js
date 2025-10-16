const pool = require("../../config/db");
const { v4: uuidv4 } = require("uuid");
const createTransporter = require("../../config/transporter");
const { da } = require("date-fns/locale");
const applicantModel = require("../../models/applicant/applicantModel");
const userModel = require("../../models/user/userModel");

const emailSignature = (userData) => {
    const fullName = `${userData.first_name} ${userData.last_name}`;
    const jobTitle = userData.job_title || 'Team Member';
    const companyName = userData.company_name;
    const companyWebsite = `https://${userData.company_name}.com`;
    const contactNumber = userData.contact_number ? `📞 ${userData.contact_number}` : "";
    const email = userData.user_email ? `✉️ <a href="mailto:${userData.user_email}" style="color: #008080; text-decoration: none;">${userData.user_email}</a>` : "";
    const brandLogo = userData.company_logo || 'https://via.placeholder.com/80x80?text=Logo';

    return `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 15px 0; border-top: 2px solid #008080; margin-top: 20px;">
            <div style="display: flex; align-items: center;">
                <img src="${brandLogo}" alt="Company Logo" width="80" height="80" style="border-radius: 10px; margin-right: 15px;">
                <div>
                    <p style="margin: 5px 0; font-size: 14px; font-weight: bold;">${fullName}</p>
                    <p style="margin: 5px 0; font-size: 14px;">${jobTitle} | <a href="${companyWebsite}" style="color: #008080; text-decoration: none;">${companyName}</a></p>
                    <p style="margin: 5px 0; font-size: 14px;">${contactNumber} ${contactNumber && email ? '|' : ''} ${email}</p>
                    <p style="font-size: 12px; color: #777; margin-top: 10px; font-style: italic;">
                        Confidentiality Notice: This email and any attachments are confidential and intended solely for the use of the individual to whom they are addressed.
                    </p>
                </div>
            </div>
        </div>
    `;
};

// Enhanced HTML processing function with applicant data replacement
function processEmailContent(htmlContent, applicantData) {
    if (!htmlContent) return '';
    
    // Replace placeholder with actual applicant name
    let processedContent = htmlContent.replace(/&lt;Applicant's Name&gt;|&lt;Applicant's Name&gt;|Applicant's Name/g, applicantData.first_name);
    
    // Process the HTML for email compatibility
    processedContent = processedContent
        // Replace empty paragraphs with proper spacing
        .replace(/<p><br><\/p>/g, '<p style="margin: 10px 0; line-height: 1.6;">&nbsp;</p>')
        .replace(/<p><\/p>/g, '<p style="margin: 10px 0; line-height: 1.6;">&nbsp;</p>')
        // Add proper styling to paragraphs
        .replace(/<p>/g, '<p style="margin: 10px 0; line-height: 1.6;">')
        // Style lists
        .replace(/<ul>/g, '<ul style="padding-left: 20px; margin: 10px 0;">')
        .replace(/<ol>/g, '<ol style="padding-left: 20px; margin: 10px 0;">')
        .replace(/<li>/g, '<li style="margin: 5px 0; line-height: 1.6;">')
        // Style headings
        .replace(/<h1>/g, '<h1 style="font-size: 24px; margin: 20px 0 10px 0; font-weight: bold; line-height: 1.3;">')
        .replace(/<h2>/g, '<h2 style="font-size: 20px; margin: 18px 0 9px 0; font-weight: bold; line-height: 1.3;">')
        .replace(/<h3>/g, '<h3 style="font-size: 18px; margin: 16px 0 8px 0; font-weight: bold; line-height: 1.3;">')
        // Style blockquotes and code
        .replace(/<blockquote>/g, '<blockquote style="border-left: 4px solid #008080; margin: 10px 0; padding-left: 16px; font-style: italic; color: #666; line-height: 1.6;">')
        .replace(/<pre>/g, '<pre style="background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; font-family: monospace; line-height: 1.4;">')
        .replace(/<code>/g, '<code style="background: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: monospace;">')
        // Ensure underline styling
        .replace(/<u>/g, '<u style="text-decoration: underline;">')
        // Ensure strong styling
        .replace(/<strong>/g, '<strong style="font-weight: bold;">')
        // Ensure em styling
        .replace(/<em>/g, '<em style="font-style: italic;">');

    return processedContent;
}

// Function to create proper email HTML structure
function createEmailTemplate(content, signature) {
    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Email</title>
  <style type="text/css">
    /* Client-specific styles */
    body { 
      width: 100% !important; 
      -webkit-text-size-adjust: 100%; 
      -ms-text-size-adjust: 100%; 
      margin: 0; 
      padding: 0;
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f9f9f9;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .email-content {
      line-height: 1.6;
    }
    
    /* Prevent Webkit and Windows Mobile platforms from changing default font sizes */
    .ExternalClass { 
      width: 100%; 
    }
    
    /* Force Hotmail to display normal line spacing */
    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { 
      line-height: 100%; 
    }
    
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        padding: 15px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f9f9;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f9f9f9;">
    <tr>
      <td align="center">
        <table class="email-container" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 20px;">
              <div class="email-content">
                ${content}
              </div>
            </td>
          </tr>
          <tr>
            <td>
              ${signature}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Helper function to get SMTP credentials with fallback
const getSmtpCredentials = (userData) => {
    const email = userData?.user_email || process.env.SMTP_EMAIL_DEFAULT;
    const password = userData?.app_password || process.env.SMTP_PASSWORD_DEFAULT;
    
    if (!email || !password) {
        throw new Error('SMTP credentials not found. Please check environment variables or user data.');
    }
    
    return { email_user: email, email_pass: password };
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

    const userData = await userModel.getUserInfo(user_id);

    const recipientEmails = [
      applicantData.email_1,
      applicantData.email_2,
      applicantData.email_3,
    ].filter(Boolean);

    // Process the email body with applicant data
    const processedEmailBody = processEmailContent(email_body, applicantData);
    const emailSignatureString = emailSignature(userData);
    
    // Create the final email HTML with proper structure
    const finalEmailBody = createEmailTemplate(processedEmailBody, emailSignatureString);

    const attachments = req.files
      ? req.files.map((file) => ({
          filename: file.originalname,
          content: file.buffer,
        }))
      : [];

    // Get SMTP credentials with fallback
    const smtpCredentials = getSmtpCredentials(userData);

    // Create mail options with proper encoding
    const mailOptions = {
      from: `"${userData.company_name}" <${smtpCredentials.email_user}>`,
      to: recipientEmails,
      cc: "hireme@getfullsuite.com",
      bcc: userData.user_email,
      subject: email_subject,
      html: finalEmailBody,
      encoding: 'utf-8',
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Content-Transfer-Encoding': 'quoted-printable'
      }
    };

    // create transporter
    const transporter = createTransporter(smtpCredentials);

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
        

        const userData = await userModel.getUserInfo(user_id);
       
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
                <a href="${applicantData.assessment_url}" style="color: #008080;">Start Assessment</a></p>

                <p>The entire test may take you between 40–80 minutes. Some candidates may find the exercise a bit too fast for comfort, 
                but our advice is that you answer each question as honestly as you can.</p>

                <p>For more information about our company and what we do, kindly visit our website here: 
                <a href="https://www.suitelifer.com/" style="color: #008080;">https://www.suitelifer.com/</a></p>

                <p>We look forward to reviewing your completed tests and getting to know you better.</p>
            </div>
        `;

        const recipientEmails = [
            applicantData.email_1, 
            applicantData.email_2, 
            applicantData.email_3
        ].filter(Boolean);

        const processedEmailBody = processEmailContent(email_body, applicantData);
        const emailSignatureString = emailSignature(userData);
        
        const finalEmailBody = createEmailTemplate(processedEmailBody, emailSignatureString);

        // Get SMTP credentials with fallback
        const smtpCredentials = getSmtpCredentials(userData);

        // Create mail options
        const mailOptions = {
            from: `"${userData.company_name}" <${smtpCredentials.email_user}>`,
            to: recipientEmails,
            cc: "hireme@getfullsuite.com",
            bcc: userData.user_email, // ensures sender also gets inbox copy
            subject: email_subject,
            html: finalEmailBody,
            encoding: 'utf-8',
            headers: {
                'Content-Type': 'text/html; charset=UTF-8',
                'Content-Transfer-Encoding': 'quoted-printable'
            }
        };

        // Create transporter
        const transporter = createTransporter(smtpCredentials);
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

        const response = await exports.emailTestAssessment(applicant_id, user_id);

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
        const emailSubject = `New Applicant for <strong>${applicantData.job_title}</strong> Position`;

        const emailBody = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2 style="color: #2c3e50;">New Application Received</h2>
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

        const processedEmailBody = processEmailContent(emailBody, applicantData);
        const emailSignatureString = emailSignature(userData);
        
        const finalEmailBody = createEmailTemplate(processedEmailBody, emailSignatureString);

        // Get SMTP credentials with fallback
        const smtpCredentials = getSmtpCredentials(userData);

        const mailOptions = {
            from: `"${userData.company_name}" <${smtpCredentials.email_user}>`,
            to: recipientEmails,
            subject: emailSubject.replace(/<[^>]+>/g, ""), // remove HTML for plain subject
            html: finalEmailBody,
            encoding: 'utf-8',
            headers: {
                'Content-Type': 'text/html; charset=UTF-8',
                'Content-Transfer-Encoding': 'quoted-printable'
            }
        };

        const transporter = createTransporter(smtpCredentials);

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
        const processedEmailBody = processEmailContent(email_body, applicant);
        const emailSignatureString = emailSignature(userData);
        
        const finalEmailBody = createEmailTemplate(processedEmailBody, emailSignatureString);

        // Get SMTP credentials with fallback
        const smtpCredentials = getSmtpCredentials(userData);

        // Create mail options
        const mailOptions = {
            from: `"${userData.company_name}" <${smtpCredentials.email_user}>`,
            to: recipientEmails,
            subject: email_subject,
            html: finalEmailBody,
            encoding: 'utf-8',
            headers: {
                'Content-Type': 'text/html; charset=UTF-8',
                'Content-Transfer-Encoding': 'quoted-printable'
            }
        };

        //create transporter
        const transporter = createTransporter(smtpCredentials);
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