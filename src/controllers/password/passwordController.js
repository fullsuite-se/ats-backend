const { pool } = require("../../config/db");
const createTransporter = require("../../config/transporter");
const userModel = require("../../models/user/userModel");
const { v4: uuidv4 } = require("uuid");


module.exports.requestReset = async (req, res) => {
    // default user. 
    const USER_ID = process.env.USER_ID;

    try {
        //email of the user making a password reset request
        const user_email = req.body.user_email;
        //info of the default user.
        const userData = await userModel.getUserInfo(USER_ID);

        const password_reset_id = uuidv4();
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        //insert into password reset table 
        const sql = `INSERT INTO password_resets (password_reset_id, user_email, otp_code, expires_at) VALUES (?, ?, ?, ?)`;
        const values = [password_reset_id, user_email, otp, expiresAt];
        await pool.execute(sql, values);

        const email_subject = `Fullsuite Password Reset Code`;
        const email_body = `Your OTP: ${otp}. Proceed before it expires in 10 minutes.`;

        // Create mail options
        const mailOptions = {
            from: `"FullSuite" <${userData.user_email}>`,
            to: user_email,
            subject: email_subject,
            html: email_body,
        };

        //create transporter
        const transporter = createTransporter({ email_user: userData.user_email, email_pass: userData.app_password })
        const info = await transporter.sendMail(mailOptions);
        return res.status(200).json({ message: "otp sent successfully", info: info.response });
    } catch (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({ message: error.message });
    }
}


module.exports.verifyOTP = async (req, res) => {
    
}