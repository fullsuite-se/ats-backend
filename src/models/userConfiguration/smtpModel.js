const { json } = require("express");
const pool = require("../../config/db"); 

const addSmtpCredentials = async (user_id, app_pass) =>  {
    try {
        // Check if user_id already exists
        const checkSql = `SELECT COUNT(*) AS count FROM ats_smtp_credentials WHERE user_id = ?`;
        const [rows] = await pool.execute(checkSql, [user_id]);
        
        if (rows[0].count > 0) {
            // Update the existing record
            const updateSql = `UPDATE ats_smtp_credentials SET app_password = ? WHERE user_id = ?`;
            await pool.execute(updateSql, [app_pass, user_id]);
        } else {
            // Insert a new record
            const insertSql = `INSERT INTO ats_smtp_credentials (user_id, app_password) VALUES (?, ?)`;
            await pool.execute(insertSql, [user_id, app_pass]);
        }
    } catch (error) {
        console.log(error.message);
    }
}
const getSmtpCredentials = async (user_id) => {
    try {
        const sql = `SELECT COUNT(*) AS count FROM ats_smtp_credentials WHERE user_id = ?`;
        const [rows] = await pool.execute(sql, [user_id]);
        return rows[0].count > 0;
    } catch (error) {
        console.log(error.message);
        return false;
    }
}

module.exports = {
    addSmtpCredentials,
    getSmtpCredentials
}