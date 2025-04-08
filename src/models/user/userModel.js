const pool = require("../../config/db");

const getUserInfo = async (user_id) => {
    try {
        const sql = `
            SELECT
                a.*,
                i.*,
                c.*, 
                d.*, 
                t.*, 
                ci.* 
            FROM hris_user_accounts a
            LEFT JOIN hris_user_infos i ON a.user_id = i.user_id
            LEFT JOIN ats_smtp_credentials c ON i.user_id = c.user_id
            LEFT JOIN hris_user_designations d ON i.user_id = d.user_id
            LEFT JOIN company_job_titles t ON d.job_title_id = t.job_title_id
            LEFT JOIN company_infos ci ON d.company_id = ci.company_id
            WHERE a.user_id = ?;
        `;
        
        const [results] = await pool.execute(sql, [user_id]);
        return results[0];
    } catch (error) {
        console.log(error.message);
        return [];

    }
}





module.exports = {getUserInfo}