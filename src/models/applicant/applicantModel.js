const pool = require("../../config/db");
const { v4: uuidv4 } = require("uuid");

// VARIABLES USED WHEN APPLIED FROM SUITELIFER'S WEBSITE. 
const CREATED_BY = process.env.CREATED_BY;
const UPDATED_BY = process.env.UPDATED_BY 


const insertApplicant = async (applicant, user_id=null) => {
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
            applicant.updated_by || user_id||  UPDATED_BY,
            applicant.test_result || null, 
            applicant.applied_source || null,
            applicant.referrer_name || null,
            "468eb32f-f8c1-11ef-a725-0af0d960a833", //company id
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




module.exports = {insertApplicant}