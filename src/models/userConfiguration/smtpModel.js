const pool = require("../../config/db"); 

const addSmtpCredentials = async (data) =>  {
    try {

        const sql = `
        INSERT INTO ats_smtp_credentials (user_id, app_password)
        VALUES (?, ?);
        `;
        const values = [data.user_id, data.app_password];
        await pool.execute(sql, values);
        return true
    } catch (error) {
        console.log(error.message);
        return false
    }
}

module.exports = {
    addSmtpCredentials
}