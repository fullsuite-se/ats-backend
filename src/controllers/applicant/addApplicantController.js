const multer = require('multer');
const upload = multer();
require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const pool = require("../../config/db");
const app = require("../../app");
const emailController = require("../email/emailController");
const positionModel = require("../../models/position/positionModel");
const applicantModel = require("../../models/applicant/applicantModel");
const stageMapping = require("../../utils/statusMapping"); 
//DEFAULT 
const USER_ID = process.env.USER_ID; 

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
  const applicantsFromDB = await applicantModel.getAllApplicants();

  const possibleDuplicates = compare(applicant, applicantsFromDB);
  if (possibleDuplicates.length > 0) {
    return res.json({ isDuplicate: true, message: "possible duplicates detected", possibleDuplicates: possibleDuplicates });
  }
  return res.json({ isDuplicate: false, message: "no duplicates detected" });
};

// when applied from ATS, add the user_id to created_by and updated_by
exports.addApplicant = async (req, res) => {
  try {
    console.log("Request body:", req.body);

    if (!req.body.applicant) {
      return res.status(400).json({ message: "Applicant data is missing" });
    }

    const applicant = JSON.parse(req.body.applicant);
    const isFromATS = applicant.created_by && applicant.updated_by;
    
    // Set default values based on source
    applicant.stage = "PRE_SCREENING";
    applicant.status = isFromATS ? "UNPROCESSED" : "TEST_SENT";

    // Insert applicant
    const { applicant_id } = await applicantModel.insertApplicant(applicant);

    // Send test email if from FS
    if (!isFromATS) {
      await emailController.emailTestAssessment(applicant_id, USER_ID);
    }

    return res.status(201).json({ message: "successfully inserted" });
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
            applicant.position_id = null;
          }
        });
        console.log(applicants);
        const flagged = [];
        const successfulInserts = [];
        const failedInserts = [];
        const applicantsFromDB = await applicantModel.getAllApplicants();
        for (const applicant of applicants) {
          const possibleDuplicates = compare(applicant, applicantsFromDB);
          if (possibleDuplicates.length > 0) {
            flagged.push({ applicant: applicant, possibleDuplicates: possibleDuplicates });
          } else {
            try {

              //map the status to stage
              const formattedStatus = applicant.status 
              ? applicant.status.toUpperCase().replace(/ /g, '_') 
              : 'PRE_SCREENING';
              
              const mappedStage = stageMapping.mapStatusToStage(formattedStatus); 
              applicant.stage = mappedStage; 

              const isInserted = await applicantModel.insertApplicant(applicant);
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