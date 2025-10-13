const multer = require("multer");
const upload = multer();
require("dotenv").config();

const { v4: uuidv4 } = require("uuid");
const pool = require("../../config/db");
const app = require("../../app");
const emailController = require("../email/emailController");
const positionModel = require("../../models/position/positionModel");
const applicantModel = require("../../models/applicant/applicantModel");
const stageMapping = require("../../utils/statusMapping");
const notificationController = require("../../controllers/notification/notificationController");
const statusHistoryController = require("../../controllers/applicant/statusHistoryController");

//DEFAULT
const USER_ID = process.env.USER_ID;

// Compare applicants for duplicates
const compare = (applicant, applicantsFromDB) => {
  const possibleDuplicates = [];

  applicantsFromDB.forEach((applicantFromDb) => {
    const similarity = [];

    const applicantFullname = `${applicant.first_name} ${
      applicant.middle_name ?? ""
    } ${applicant.last_name}`.trim();
    const applicantFromDBFullname = `${applicantFromDb.first_name} ${
      applicantFromDb.middle_name ?? ""
    } ${applicantFromDb.last_name}`.trim();

    if (applicant.applicant_id != applicantFromDb.applicant_id) {
      // Only compare first name if both exist and are equal (not null)
      if (
        applicantFullname &&
        applicantFromDBFullname &&
        applicantFullname.toLowerCase() ===
          applicantFromDBFullname.toLowerCase()
      ) {
        similarity.push("Name");
      }

      // Only compare emails if both exist and are equal (not null)
      if (
        applicantFromDb.email_1 &&
        applicant.email_1 &&
        applicant.email_1 === applicantFromDb.email_1
      ) {
        similarity.push("Email");
      }

      if (
        applicantFromDb.email_2 &&
        applicant.email_1 &&
        applicant.email_1 === applicantFromDb.email_2
      ) {
        similarity.push("Second Email");
      }

      if (
        applicantFromDb.email_3 &&
        applicant.email_1 &&
        applicant.email_1 === applicantFromDb.email_3
      ) {
        similarity.push("Third Email");
      }

      //Email 2
      if (
        applicantFromDb.email_1 &&
        applicant.email_2 &&
        applicant.email_2 === applicantFromDb.email_1
      ) {
        similarity.push("Email");
      }

      if (
        applicantFromDb.email_2 &&
        applicant.email_2 &&
        applicant.email_2 === applicantFromDb.email_2
      ) {
        similarity.push("Second Email");
      }

      if (
        applicantFromDb.email_3 &&
        applicant.email_2 &&
        applicant.email_2 === applicantFromDb.email_3
      ) {
        similarity.push("Third Email");
      }

      //Email 3
      if (
        applicantFromDb.email_1 &&
        applicant.email_3 &&
        applicant.email_3 === applicantFromDb.email_1
      ) {
        similarity.push("Email");
      }

      if (
        applicantFromDb.email_2 &&
        applicant.email_3 &&
        applicant.email_3 === applicantFromDb.email_2
      ) {
        similarity.push("Second Email");
      }

      if (
        applicantFromDb.email_3 &&
        applicant.email_3 &&
        applicant.email_3 === applicantFromDb.email_3
      ) {
        similarity.push("Third Email");
      }

      // Only compare mobile numbers if both exist and are equal (not null)
      if (
        applicantFromDb.mobile_number_1 &&
        applicant.mobile_number_1 &&
        applicant.mobile_number_1 === applicantFromDb.mobile_number_1
      ) {
        similarity.push("Mobile Number");
      }

      if (
        applicantFromDb.mobile_number_2 &&
        applicant.mobile_number_1 &&
        applicant.mobile_number_1 === applicantFromDb.mobile_number_2
      ) {
        similarity.push("Second Mobile Number");
      }

      //Second Number
      if (
        applicantFromDb.mobile_number_1 &&
        applicant.mobile_number_2 &&
        applicant.mobile_number_2 === applicantFromDb.mobile_number_1
      ) {
        similarity.push("Mobile Number");
      }

      if (
        applicantFromDb.mobile_number_2 &&
        applicant.mobile_number_2 &&
        applicant.mobile_number_2 === applicantFromDb.mobile_number_2
      ) {
        similarity.push("Second Mobile Number");
      }

      // Only add to possible duplicates if there are similarities found
      if (similarity.length > 0) {
        possibleDuplicates.push({
          applicantFromDb: applicantFromDb,
          similarity: similarity,
        });
      }
    }
  });

  return possibleDuplicates;
};

exports.checkDuplicates = async (req, res) => {
  const applicant = JSON.parse(req.body.applicant);
  const applicantsFromDB = await applicantModel.getAllApplicants();

  const possibleDuplicates = compare(applicant, applicantsFromDB);
  if (possibleDuplicates.length > 0) {
    return res.json({
      isDuplicate: true,
      message: "possible duplicates detected",
      possibleDuplicates: possibleDuplicates,
    });
  }
  return res.json({ isDuplicate: false, message: "no duplicates detected" });
};

exports.addApplicant = async (req, res) => {
  try {
    if (!req.body.applicant) {
      return res.status(400).json({ message: "Applicant data is missing" });
    }

    const applicant = JSON.parse(req.body.applicant);
    const isFromATS = applicant.created_by && applicant.updated_by;

    applicant.stage = "PRE_SCREENING";
    applicant.status = isFromATS ? "UNPROCESSED" : "TEST_SENT";

    const { applicant_id, progress_id } = await applicantModel.insertApplicant(applicant);

    await statusHistoryController.addInitialStatusHistory(
      {
        body: {
          progressId: progress_id,
          isFromATS: isFromATS,
          userId: applicant.created_by,
        },
      },
      {
        status: () => ({ json: () => {} }),
      }
    );

    // Send Slack notification for new applicant (only for external applications)
    if (!isFromATS) {
      try {
        await notificationController.newApplicant(applicant_id);
        console.log("Slack notification sent for new applicant:", applicant_id);
      } catch (slackError) {
        console.error("Failed to send Slack notification:", slackError);
        // Don't fail the whole request if Slack fails
      }
    }

    if (!isFromATS) {
      await emailController.emailTestAssessment(applicant_id, USER_ID);
      await notificationController.addNotification(
        applicant_id,
        "NEW APPLICANT"
      );
    }

    return res
      .status(201)
      .json({ message: "Successfully inserted", applicant_id });

  } catch (error) {
    console.error("Error processing applicant:", error);
    res
      .status(500)
      .json({ message: "Error processing applicant", error: error.message });
  }
};

exports.uploadApplicants = [
  upload.none(),
  async (req, res) => {
    try {
      if (!req.body.applicants) {
        return res
          .status(400)
          .json({ message: "No applicants data found in request" });
      }
      const applicants = JSON.parse(req.body.applicants);
      const positions = await positionModel.getAllPosiitons();
      if (!Array.isArray(applicants)) {
        return res
          .status(400)
          .json({ message: "Applicants data is not an array" });
      }
      // Map position to position_id
      const positionMap = new Map(
        positions.map((pos) => [pos.title, pos.job_id])
      );
      applicants.forEach((applicant) => {
        if (applicant.position && positionMap.has(applicant.position)) {
          applicant.position_id = positionMap.get(applicant.position);
        } else {
          applicant.position_id = null;
        }
      });
      const flagged = [];
      const successfulInserts = [];
      const failedInserts = [];
      const applicantsFromDB = await applicantModel.getAllApplicants();
      for (const applicant of applicants) {
        const possibleDuplicates = compare(applicant, applicantsFromDB);
        if (possibleDuplicates.length > 0) {
          flagged.push({
            applicant: applicant,
            possibleDuplicates: possibleDuplicates,
          });
        } else {
          try {
            //map the status to stage
            const mappedStage = stageMapping.mapStatusToStage(applicant.status);
            applicant.stage = mappedStage;

            const { applicant_id } = await applicantModel.insertApplicant(applicant);
            if (applicant_id) {
              successfulInserts.push(applicant);
              
              // Send Slack notification for each successfully inserted applicant
              try {
                await notificationController.newApplicant(applicant_id);
                console.log("Slack notification sent for bulk upload applicant:", applicant_id);
              } catch (slackError) {
                console.error("Failed to send Slack notification for bulk upload applicant:", applicant_id, slackError);
              }
            } else {
              failedInserts.push({
                applicant,
                reason: "Database insert returned no applicant_id",
              });
            }
          } catch (insertError) {
            console.error(
              `Error inserting applicant: ${JSON.stringify(applicant)} ${
                applicant.first_name
              } ${applicant.last_name} (${applicant.email_1}). Error: ${
                insertError.message
              }`
            );
            failedInserts.push({ applicant, reason: insertError.message });
          }
        }
      }
      return res.status(200).json({
        message: `Processed ${applicants.length} applicants. Inserted: ${successfulInserts.length}, Flagged: ${flagged.length}, Failed: ${failedInserts.length}`,
        flagged: flagged,
        successful: successfulInserts.length,
        failed: failedInserts.length > 0 ? failedInserts : undefined,
      });
    } catch (error) {
      console.error("Error processing applicants:", error);
      res
        .status(500)
        .json({ message: "Error processing applicants", error: error.message });
    }
  },
];