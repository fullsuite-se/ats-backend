const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../../config/db");
const { v4: uuidv4 } = require("uuid");

exports.login = async (req, res) => {
    const { user_email, user_password } = req.body;
    const JWT_SECRET = process.env.JWT_SECRET;

    try {
        const sql = `SELECT * FROM hris_user_accounts WHERE user_email = ?`;
        const values = [user_email];

        const [results] = await pool.execute(sql, values);
        if (results.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const user = results[0];

        // Check if the account is deactivated
        if (user.is_deactivated !== 0) {
            return res.status(403).json({ message: "Account is not active. Please contact support." });
        }

        // Check if the password matches
        const passwordMatch = await bcrypt.compare(user_password, user.user_password);
        if (!passwordMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { user_id: user.user_id, user_email: user.user_email },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(200).json({ message: "Login successfully", token: token });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};