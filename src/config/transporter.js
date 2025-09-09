const nodemailer = require("nodemailer");
require("dotenv").config();

// Transporter for email feature. 
// We're creating a transporter for each accounts
const createTransporter = (user) => {

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: true,
        auth: {
            user: user.email_user,
            pass: user.email_pass
        }
    });
}


module.exports = createTransporter;