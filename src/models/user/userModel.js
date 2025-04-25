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
        return null; // Return null instead of empty array for single user
    }
}

const getAllUserAccounts = async () => {
    const sql = `
    SELECT 
        u.user_id, 
        u.user_email, 
        u.user_key, 
        u.is_deactivated, 
        u.created_at,
        d.company_id, 
        d.job_title_id, 
        d.department_id, 
        d.division_id, 
        d.upline_id,
        i.user_info_id, 
        i.first_name, 
        i.middle_name, 
        i.last_name, 
        i.extension_name,
        i.sex, 
        i.user_pic, 
        i.personal_email, 
        i.contact_number, 
        i.birthdate,
        t.*,
        (
            SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                    'service_feature_id', sf.service_feature_id,
                    'feature_name', sf.feature_name
                )
            ) AS service_features
            FROM hris_user_access_permissions uap
            JOIN service_features sf ON uap.service_feature_id = sf.service_feature_id
            WHERE uap.user_id = u.user_id
        ) AS service_features
    FROM hris_user_accounts u
    LEFT JOIN hris_user_designations d ON u.user_id = d.user_id
    LEFT JOIN hris_user_infos i ON u.user_id = i.user_id
    LEFT JOIN company_job_titles t ON d.job_title_id = t.job_title_id
    `;
    const [results] = await pool.execute(sql);
    return results;
}

module.exports = { getUserInfo, getAllUserAccounts };