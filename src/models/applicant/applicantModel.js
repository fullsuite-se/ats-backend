const { get } = require("../../app");
const pool = require("../../config/db");
const { v4: uuidv4 } = require("uuid");

// VARIABLES USED WHEN APPLIED FROM SUITELIFER'S WEBSITE. 
const CREATED_BY = process.env.CREATED_BY;
const UPDATED_BY = process.env.UPDATED_BY


const insertApplicant = async (applicant, user_id = null) => {
    const applicant_id = uuidv4();
    const contact_id = uuidv4();
    const tracking_id = uuidv4();
    const progress_id = uuidv4();
    const interview_id = uuidv4();
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Insert into ats_applicant_progress
        let sql = `INSERT INTO ats_applicant_progress (progress_id, stage, status) VALUES (?, ?, ?)`;
        let values = [
            progress_id,
            applicant.stage || 'PRE_SCREENING',
            applicant.status || 'TEST_SENT'
        ];
        await connection.execute(sql, values);

        // Insert into ats_applicant_trackings
        sql = `INSERT INTO ats_applicant_trackings (tracking_id, applicant_id, progress_id, created_at, created_by, updated_by, test_result,  applied_source, referrer_name, company_id, position_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        values = [
            tracking_id,
            applicant_id,
            progress_id,
            applicant.date_applied || new Date(), //since we use date_applied in payload. 
            applicant.created_by || user_id || CREATED_BY,
            applicant.updated_by || user_id || UPDATED_BY,
            applicant.test_result || null,
            applicant.applied_source || null,
            applicant.referrer_name || null,
            process.env.COMPANY_ID,
            applicant.position_id,
        ];
        await connection.execute(sql, values);

        // Insert into ats_applicants
        sql = `INSERT INTO ats_applicants (applicant_id, first_name, middle_name, last_name, contact_id, gender, birth_date, discovered_at, cv_link) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        values = [
            applicant_id,
            applicant.first_name,
            applicant.middle_name || null,
            applicant.last_name,
            contact_id,
            applicant.gender,
            applicant.birth_date,
            applicant.discovered_at, // Store as string
            applicant.cv_link || null
        ];
        await connection.execute(sql, values);

        // Insert into ats_contact_infos
        sql = `INSERT INTO ats_contact_infos (contact_id, applicant_id, mobile_number_1, mobile_number_2, email_1, email_2, email_3) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`;
        values = [
            contact_id,
            applicant_id,
            applicant.mobile_number_1 || null,
            applicant.mobile_number_2 || null,
            applicant.email_1,
            applicant.email_2 || null,
            applicant.email_3 || null
        ];
        await connection.execute(sql, values);

        //insert discussion (in interview table)
        sql = `INSERT INTO ats_applicant_interviews (interview_id, tracking_id, interviewer_id, date_of_interview)
                     VALUES (?, ?, ?, ?)`;
        values = [interview_id, tracking_id, null, null];
        await connection.execute(sql, values);

        // Commit the transaction if all queries succeed
        await connection.commit();
        return true;
    } catch (error) {
        if (connection) {
            await connection.rollback(); // Rollback on error
        }
        console.error("Error inserting applicant:", error);
        return false;
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
        }
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
}



module.exports = { insertApplicant, getAllApplicants, getApplicant }