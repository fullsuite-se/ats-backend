const pool = require("../../config/db");
const { v4: uuidv4 } = require('uuid');
const emailController = require("../../controllers/email/emailController");
const statusMapping = require("../../utils/statusMapping");

// Helper to convert ISO date string to MySQL DATETIME format
function toMySQLDateTime(dateString) {
    if (!dateString || dateString === "N/A") return null;
    // Handles both "YYYY-MM-DDTHH:mm:ss" and "YYYY-MM-DD"
    return dateString.replace('T', ' ').slice(0, 19);
}

const updateStatus = async (progress_id, user_id, status, change_date = null, blacklisted_type, reason, reason_for_rejection) => {
    const converted_status = status.toUpperCase().replace(/ /g, "_");

    // get the corresponding stage based on status
    let stage = statusMapping.mapStatusToStage(converted_status);

    try {
        // Get the current status before updating
        let getPreviousStatusSQL = "SELECT status FROM ats_applicant_progress WHERE progress_id = ?";
        const [previousStatusResult] = await pool.execute(getPreviousStatusSQL, [progress_id]);
        const previousStatus = previousStatusResult.length > 0 ? previousStatusResult[0].status : null;

        // Update status of applicant
        let sql;
        let values;
        if (blacklisted_type) {
            // updating to blacklisted
            sql = "UPDATE ats_applicant_progress SET stage = ?, status = ?, updated_at = NOW(), blacklisted_type = ?, reason = ? WHERE progress_id = ?";
            values = [
                stage,
                converted_status,
                blacklisted_type,
                reason,
                progress_id
            ];
        } else if (reason_for_rejection) {
            sql = "UPDATE ats_applicant_progress SET stage = ?, status = ?, updated_at = NOW(), reason_for_rejection = ? WHERE progress_id = ?";
            values = [
                stage,
                converted_status,
                reason_for_rejection,
                progress_id
            ];
        } else {
            sql = "UPDATE ats_applicant_progress SET stage = ?, status = ?, updated_at = NOW() WHERE progress_id = ?";
            values = [
                stage,
                converted_status,
                progress_id
            ];
        }

        await pool.execute(sql, values);

        // Update tracking info
        sql = `
            UPDATE ats_applicant_trackings 
            SET updated_by = ?, updated_at = NOW()
            WHERE progress_id = ?
        `;
        values = [user_id, progress_id];
        await pool.execute(sql, values);

        // Record the status change in history table
        if (previousStatus !== converted_status) {
            const historyId = uuidv4();

            const insertHistorySQL = `
                INSERT INTO ats_applicant_status_history 
                (history_id, progress_id, previous_status, new_status, changed_by, changed_at) 
                VALUES (?, ?, ?, ?, ?, ${change_date && change_date !== "N/A" ? '?' : 'NOW()'})
            `;

            let historyValues = [
                historyId,
                progress_id,
                previousStatus,
                converted_status,
                user_id
            ];

            // Add the custom date if provided, convert to MySQL format
            if (change_date && change_date !== "N/A") {
                historyValues.push(toMySQLDateTime(change_date));
            }

            await pool.execute(insertHistorySQL, historyValues);
        }

        return true;
    } catch (error) {
        console.log(error.message);
        return false;
    }
};

exports.updateApplicantStatus = async (req, res) => {
    const { progress_id, applicant_id, user_id, status, change_date, previous_status, blacklisted_type, reason, reason_for_rejection } = req.body;
    console.log(req.body);
    console.log(blacklisted_type);
    console.log(reason);

    const isSuccess = await updateStatus(progress_id, user_id, status, change_date, blacklisted_type, reason, reason_for_rejection);
    if (isSuccess) {
        // if send test assessment email if pre-screening to test-sent
        if (status.toUpperCase() === "TEST_SENT") {
            // send email
            const response = await emailController.emailTestAssessment(applicant_id, user_id);
            if (response == null) {
                // response is null
                return res.status(201).json({ message: "Successfully updated status of applicant", test_assessment: "Failed to send test assessment" });
            }
        }
        return res.status(201).json({ message: "Successfully updated status of applicant" });
    }
    return res.status(500).json({ message: "Failed to update status of applicant" });
};