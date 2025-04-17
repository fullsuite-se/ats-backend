const pool = require("../../config/db");
const { v4: uuidv4 } = require("uuid");

const addGdriveConfigurationCredentials = async (company_id, config_json, gdrive_folder_id) => {
    const gdrive_config_id = uuidv4();

    // Check if entry exists
    const [rows] = await pool.execute(
        `SELECT gdrive_config_id FROM ats_gdrive_config WHERE company_id = ?`,
        [company_id]
    );

    if (rows.length > 0) {
        // Update existing entry
        await pool.execute(
            `UPDATE ats_gdrive_config
             SET config_json = ?, gdrive_folder_id = ?
             WHERE company_id = ?`,
            [config_json, gdrive_folder_id, company_id]
        );
    } else {
        // Insert new entry
        await pool.execute(
            `INSERT INTO ats_gdrive_config (gdrive_config_id, company_id, config_json, gdrive_folder_id)
             VALUES (?, ?, ?, ?)`,
            [gdrive_config_id, company_id, config_json, gdrive_folder_id]
        );
    }

    return true;
};

// retrieves only the important data for storing into gdrive. 
const getGdriveConfig = async (company_id) => {
    const sql = `
        SELECT * 
        FROM  ats_gdrive_config
        WHERE company_id = ?; 
    `;
    const values = [company_id];
    const [results] = await pool.execute(sql, values);
    const config_json = results[0].config_json;
    const gdrive_folder_id = results[0].gdrive_folder_id;
    return {config_json, gdrive_folder_id}; 
}

const getGdriveConfibyid = async (company_id) => {
    const sql = `
        SELECT 1 
        FROM ats_gdrive_config
        WHERE company_id = ?; 
    `;
    const values = [company_id];
    const [results] = await pool.execute(sql, values);
    return results.length > 0;
}

module.exports = { addGdriveConfigurationCredentials, getGdriveConfig , getGdriveConfibyid}; 