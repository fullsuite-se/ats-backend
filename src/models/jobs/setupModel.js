const pool = require("../../config/db.js");

const Setup = {
  getAllSetups: async () => {
    const query = `
      SELECT 
        setup_id AS setupId, 
        setup_name AS setupName, 
        created_at AS createdAt,
        CONCAT(hris_user_infos.first_name, ' ', hris_user_infos.last_name) AS createdBy
      FROM sl_company_jobs_setups
      INNER JOIN hris_user_infos ON hris_user_infos.user_id = sl_company_jobs_setups.created_by
    `;
    
    const [setups] = await pool.query(query);
    return setups;
  },

  insertSetup: async (newSetup) => {
    const query = `INSERT INTO sl_company_jobs_setups SET ?`;
    await pool.query(query, newSetup);
  },

  updateSetup: async (setup_id, setup_name) => {
    const query = `UPDATE sl_company_jobs_setups SET setup_name = ? WHERE setup_id = ?`;
    const [result] = await pool.query(query, [setup_name, setup_id]);
    return result.affectedRows;
  },

  deleteSetup: async (setup_id) => {
    const query = `DELETE FROM sl_company_jobs_setups WHERE setup_id = ?`;
    const [result] = await pool.query(query, [setup_id]);
    return result.affectedRows;
  },
};

module.exports = Setup;