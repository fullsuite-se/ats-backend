const multer = require('multer');
const upload = multer();
require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const pool = require("../../config/db");
const app = require("../../app");
const emailController = require("../email/emailController");
const positionModel = require("../../models/position/positionModel"); 

// VARIABLES USED WHEN APPLIED FROM SUITELIFER'S WEBSITE. 
const CREATED_BY = process.env.CREATED_BY;
const UPDATED_BY = process.env.UPDATED_BY;

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

const getAllApplicants = async () => {
    const sql = `
        SELECT *
        FROM ats_applicants
        INNER JOIN ats_contact_infos USING (contact_id)
    `;

    try {
        const [results, fields] = await pool.execute(sql);
        return results;
    } catch (error) {
        console.error(error);
        return [];
    }
};

// Compare applicants for duplicates
const compare = (applicant, applicantsFromDB) => {
    const possibleDuplicates = [];

    applicantsFromDB.forEach(applicantFromDb => {
        const similarity = [];

        const applicantFullname = `${applicant.first_name} ${applicant.middle_name ?? ""} ${applicant.last_name}`.trim();
        const applicantFromDBFullname = `${applicantFromDb.first_name} ${applicantFromDb.middle_name ?? ""} ${applicantFromDb.last_name}`.trim();

        if (applicant.first_name === applicantFromDb.first_name) {
            similarity.push("Name");
        }

        if (applicantFromDb.email_1 && applicant.email_1 === applicantFromDb.email_1) {
            similarity.push("Email");
        }

        if (applicantFromDb.email_2 && applicant.email_1 === applicantFromDb.email_2) {
            similarity.push("Second Email");
        }

        if (applicantFromDb.email_3 && applicant.email_1 === applicantFromDb.email_3) {
            similarity.push("Third Email");
        }

        if (applicantFromDb.mobile_number_1 && applicant.mobile_number_1 === applicantFromDb.mobile_number_1) {
            similarity.push("Mobile Number");
        }

        if (applicantFromDb.mobile_number_2 && applicant.mobile_number_1 === applicantFromDb.mobile_number_2) {
            similarity.push("Second Mobile Number");
        }

        if (applicant.birth_date === applicantFromDb.birth_date) {
            similarity.push("Birthdate");
        }

        if (similarity.length > 0) {
            possibleDuplicates.push({ applicantFromDb: applicantFromDb, similarity: similarity });
        }
    });

    return possibleDuplicates;
};

exports.checkDuplicates = async (req, res) => {
    const applicant = JSON.parse(req.body.applicant);
    const applicantsFromDB = await getAllApplicants();

    const possibleDuplicates = compare(applicant, applicantsFromDB);
    if (possibleDuplicates.length > 0) {
        return res.json({ isDuplicate: true, message: "possible duplicates detected", possibleDuplicates: possibleDuplicates });
    }
    return res.json({ isDuplicate: false, message: "no duplicates detected" });
};

// when applied from ATS, add the user_id to created_by and updated_by
exports.addApplicant = async (req, res) => {
    try {
        console.log("Request body:", req.body); // Log the entire request body

        if (!req.body.applicant) {
            return res.status(400).json({ message: "Applicant data is missing" });
        }

        const applicant = JSON.parse(req.body.applicant);
        console.log("Parsed applicant:", applicant); // Log the parsed applicant

        const isSuccess = await insertApplicant(applicant);
        if (isSuccess) {
            console.log("Applicant inserted successfully:", applicant);
            return res.status(201).json({ message: "successfully inserted" });
        }
        console.log("Failed to insert applicant:", applicant);
        res.status(500).json({ message: "failed to insert" });
    } catch (error) {
        console.error("Error processing applicant:", error);
        res.status(500).json({ message: "Error processing applicant", error: error.message });
    }
};


// when applied from ATS, add the user_id to created_by and updated_by
exports.uploadApplicants = [
    upload.none(),
    async (req, res) => {
      try {
        console.log("Request body received:", req.body);
  
        if (!req.body.applicants) {
          return res.status(400).json({ message: "No applicants data found in request" });
        }
  
        const applicants = JSON.parse(req.body.applicants);
        console.log("Parsed applicants:", applicants);
  
        const positions = await positionModel.getPositions();
  
        if (!Array.isArray(applicants)) {
          return res.status(400).json({ message: "Applicants data is not an array" });
        }
  
        // Map position to position_id
        const positionMap = new Map(positions.map(pos => [pos.title, pos.job_id]));
  
        applicants.forEach(applicant => {
          if (applicant.position && positionMap.has(applicant.position)) {
            applicant.position_id = positionMap.get(applicant.position);
          } else {
            applicant.position_id = null; // or handle missing positions appropriately
          }
        });

        console.log(applicants);
        
  
        const flagged = [];
        const successfulInserts = [];
        const failedInserts = [];
        const applicantsFromDB = await getAllApplicants();
  
        for (const applicant of applicants) {
          const possibleDuplicates = compare(applicant, applicantsFromDB);
  
          if (possibleDuplicates.length > 0) {
            flagged.push({ applicant: applicant, possibleDuplicates: possibleDuplicates });
          } else {
            try {
              const isInserted = await insertApplicant(applicant);
              if (isInserted) {
                console.log("Applicant inserted successfully:", applicant);
                successfulInserts.push(applicant);
              } else {
                console.log("Failed to insert applicant:", applicant);
                failedInserts.push({ applicant, reason: "Database insert returned false" });
              }
            } catch (insertError) {
              console.error("Error inserting applicant:", insertError);
              failedInserts.push({ applicant, reason: insertError.message });
            }
          }
        }
  
        return res.status(200).json({
          message: `Processed ${applicants.length} applicants. Inserted: ${successfulInserts.length}, Flagged: ${flagged.length}, Failed: ${failedInserts.length}`,
          flagged: flagged,
          successful: successfulInserts.length,
          failed: failedInserts.length > 0 ? failedInserts : undefined
        });
      } catch (error) {
        console.error("Error processing applicants:", error);
        res.status(500).json({ message: "Error processing applicants", error: error.message });
      }
    }
  ];



