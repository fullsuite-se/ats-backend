const { get } = require("../../app");
const pool = require("../../config/db");
const { v4: uuidv4 } = require("uuid");

// VARIABLES USED WHEN APPLIED FROM SUITELIFER'S WEBSITE.
const CREATED_BY = process.env.CREATED_BY;
const UPDATED_BY = process.env.UPDATED_BY;
const COMPANY_ID = process.env.COMPANY_ID;

const insertApplicant = async (applicant, user_id = null) => {
  const ids = {
    applicant_id: uuidv4(),
    contact_id: uuidv4(),
    tracking_id: uuidv4(),
    progress_id: uuidv4(),
    interview_id: uuidv4(),
  };

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert progress
      await connection.execute(
        `INSERT INTO ats_applicant_progress (progress_id, stage, status, blacklisted_type, reason) VALUES (?, ?, ?, ?, ?)`,
        [
          ids.progress_id,
          applicant.stage,
          applicant.status,
          applicant.blacklisted_type || null,
          applicant.reason || null,
        ]
      );
    } catch (error) {
      throw new Error(`Failed to insert progress: ${error.message}`);
    }

    try {
      // Insert tracking
      await connection.execute(
        `INSERT INTO ats_applicant_trackings (tracking_id, applicant_id, progress_id, created_at, created_by, updated_by, test_result, applied_source, referrer_name, company_id, position_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ids.tracking_id,
          ids.applicant_id,
          ids.progress_id,
          applicant.created_by && applicant.updated_by
            ? applicant.date_applied
            : new Date(),
          applicant.created_by || CREATED_BY,
          applicant.updated_by || UPDATED_BY,
          applicant.test_result || null,
          applicant.applied_source.toUpperCase().replace(/ /g, "_") || null,
          applicant.referrer_name || null,
          applicant.company_id || COMPANY_ID,
          applicant.position_id,
        ]
      );
    } catch (error) {
      throw new Error(`Failed to insert tracking: ${error.message}`);
    }

    try {
      // Insert applicant - ADD THE NEW FIELDS HERE
      await connection.execute(
        `INSERT INTO ats_applicants (applicant_id, first_name, middle_name, last_name, contact_id, gender, birth_date, discovered_at, cv_link, is_first_job, reason_for_leaving) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ids.applicant_id,
          applicant.first_name,
          applicant.middle_name || null,
          applicant.last_name,
          ids.contact_id,
          applicant.gender || null,
          applicant.birth_date || null,
          applicant.discovered_at.toUpperCase().replace(/ /g, "_") || null,
          applicant.cv_link || null,
          applicant.is_first_job, // NEW FIELD
          applicant.reason_for_leaving || null, // NEW FIELD
        ]
      );
    } catch (error) {
      throw new Error(`Failed to insert applicant: ${error.message}`);
    }

    try {
      // Insert contact info
      await connection.execute(
        `INSERT INTO ats_contact_infos (contact_id, applicant_id, mobile_number_1, mobile_number_2, email_1, email_2, email_3) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          ids.contact_id,
          ids.applicant_id,
          applicant.mobile_number_1 || null,
          applicant.mobile_number_2 || null,
          applicant.email_1,
          applicant.email_2 || null,
          applicant.email_3 || null,
        ]
      );
    } catch (error) {
      throw new Error(`Failed to insert contact info: ${error.message}`);
    }

    try {
      // Insert interview
      await connection.execute(
        `INSERT INTO ats_applicant_interviews (interview_id, tracking_id, interviewer_id, date_of_interview)
                 VALUES (?, ?, ?, ?)`,
        [ids.interview_id, ids.tracking_id, null, null]
      );
    } catch (error) {
      throw new Error(`Failed to insert interview: ${error.message}`);
    }

    await connection.commit();
    return ids;
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error inserting applicant:", error.message);
    throw error; // Re-throw to be caught by the calling function
  } finally {
    if (connection) connection.release();
  }
};

const getAllApplicants = async () => {
  const sql = `
        SELECT 
            a.*, 
            c.*, 
            t.tracking_id, 
            t.created_at,
            p.status, 
            p.progress_id,
            j.title
        FROM ats_applicants a
        LEFT JOIN ats_contact_infos c
            ON a.applicant_id = c.applicant_id
        LEFT JOIN ats_applicant_trackings t
            ON a.applicant_id = t.applicant_id
        LEFT JOIN ats_applicant_progress p
            ON t.progress_id = p.progress_id
        LEFT JOIN sl_company_jobs j
            ON t.position_id = j.job_id
        ORDER BY t.created_at DESC;
    `;

  try {
    const [results, fields] = await pool.execute(sql);
    return results;
  } catch (error) {
    console.error(error);
    return [];
  }
};

const getApplicant = async (applicant_id) => {
  try {
    const sql = `
                SELECT 
                    a.applicant_id,
                    a.first_name,
                    a.middle_name,
                    a.last_name,
                    a.gender,
                    a.birth_date,
                    a.discovered_at,
                    a.cv_link,
                    a.is_first_job,        -- NEW FIELD
                    a.reason_for_leaving,  -- NEW FIELD
                    
                    c.mobile_number_1,
                    c.mobile_number_2,
                    c.email_1,
                    c.email_2,
                    c.email_3,
                    
                    t.tracking_id,
                    t.test_result,
                    t.created_at AS applicant_created_at,
                    t.created_by AS tracking_created_by,
                    t.updated_at AS tracking_updated_at,
                    t.updated_by AS tracking_updated_by,
                    t.applied_source,
                    t.referrer_name,
                    
                    p.progress_id,
                    p.stage,
                    p.status,
                    p.blacklisted_type,
                    p.reason,
                    p.updated_at AS progress_updated_at,
                    
                    j.job_id,
                    j.title AS job_title,
                    j.description AS job_description,
                    j.employment_type,
                    j.is_open AS job_is_open,
                    j.created_at AS job_created_at,
                    j.created_by AS job_created_by,
    
                    i.*
                FROM ats_applicants a
    
                LEFT JOIN ats_contact_infos c
                    ON a.contact_id = c.contact_id
    
                LEFT JOIN ats_applicant_trackings t
                    ON a.applicant_id = t.applicant_id
    
                LEFT JOIN ats_applicant_progress p
                    ON t.progress_id = p.progress_id
    
                LEFT JOIN sl_company_jobs j
                    ON t.position_id = j.job_id

                LEFT JOIN sl_job_industries i
                    ON j.industry_id = i.job_ind_id
                WHERE a.applicant_id = ?;
          `;

    const values = [applicant_id];

    const [results] = await pool.execute(sql, values);
    return results;
  } catch (error) {
    console.log(error.message);
    return {};
  }
};

const getBlackListedApplicants = async () => {
  const sql = `
              SELECT *
              FROM ats_applicants a
              LEFT JOIN ats_contact_infos c
                  ON a.applicant_id = c.applicant_id
              LEFT JOIN ats_applicant_trackings t
                  ON a.applicant_id = t.applicant_id
              LEFT JOIN ats_applicant_progress p
                  ON t.progress_id = p.progress_id
              WHERE p.status = 'BLACKLISTED';
  `;

  try {
    const [results, fields] = await pool.execute(sql);
    return results
  } catch (error) {
    console.error(error);
    return [];
  }
}

const existingApplication = async (applicant) => {
  try {
    const sql = `
    SELECT 
        a.*, 
        c.*, 
        p.*, 
        j.*
    FROM ats_applicants a
    LEFT JOIN ats_contact_infos c
        ON a.applicant_id = c.applicant_id
    LEFT JOIN ats_applicant_trackings t
        ON a.applicant_id = t.applicant_id
    LEFT JOIN ats_applicant_progress p
        ON t.progress_id = p.progress_id
    LEFT JOIN sl_company_jobs j
        ON t.position_id = j.job_id
    WHERE a.first_name = ? AND a.last_name = ? AND c.email_1 = ? AND c.mobile_number_1 = ?
  `;
    const values = [applicant.first_name, applicant.last_name, applicant.email_1, applicant.mobile_number_1];
    const [result] = await pool.execute(sql, values);
    return result;
  } catch (error) {
    console.log(error.message);
    return [];
  }
}

// Delete applicant and related data
const deleteApplicant = async (applicant_id) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // First, get tracking and contact IDs for this applicant
    const [[ids]] = await connection.execute(
      `SELECT t.tracking_id, p.progress_id, a.contact_id, i.interview_id
       FROM ats_applicants a
       LEFT JOIN ats_applicant_trackings t ON a.applicant_id = t.applicant_id
       LEFT JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
       LEFT JOIN ats_applicant_interviews i ON t.tracking_id = i.tracking_id
       WHERE a.applicant_id = ?`,
      [applicant_id]
    );

    if (!ids) {
      return false; // applicant not found
    }

    // Delete interview (if exists)
    await connection.execute(
      `DELETE FROM ats_applicant_interviews WHERE tracking_id = ?`,
      [ids.tracking_id]
    );

    // Delete status history linked to progress_id (MUST come before deleting progress)
    await connection.execute(
      `DELETE FROM ats_applicant_status_history WHERE progress_id = ?`,
      [ids.progress_id]
    );

    // Delete contact info
    await connection.execute(
      `DELETE FROM ats_contact_infos WHERE contact_id = ?`,
      [ids.contact_id]
    );

    // Delete tracking
    await connection.execute(
      `DELETE FROM ats_applicant_trackings WHERE applicant_id = ?`,
      [applicant_id]
    );

    // Delete progress
    await connection.execute(
      `DELETE FROM ats_applicant_progress WHERE progress_id = ?`,
      [ids.progress_id]
    );

    // Delete applicant
    const [result] = await connection.execute(
      `DELETE FROM ats_applicants WHERE applicant_id = ?`,
      [applicant_id]
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error deleting applicant:", error.message);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { 
  insertApplicant, 
  getAllApplicants, 
  getApplicant, 
  getBlackListedApplicants, 
  existingApplication, 
  deleteApplicant 
};