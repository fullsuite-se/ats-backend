const { json } = require("express");
const pool = require("../../config/db"); 

const addSmtpCredentials = async (user_id, app_pass) =>  {
    try {
        const sql = `
        INSERT INTO ats_smtp_credentials (user_id, app_password)
        VALUES (?, ?);
        `;
        const values = [user_id, app_pass];
        await pool.execute(sql, values);
        return 
    } catch (error) {
        console.log(error.message);
        return
    }
}

module.exports = {
    addSmtpCredentials
}