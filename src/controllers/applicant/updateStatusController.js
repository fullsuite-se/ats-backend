const pool = require("../../config/db");
const { v4: uuidv4 } = require('uuid');
const emailController = require("../../controllers/email/emailController"); 

const updateStatus = async (progress_id, user_id, status, change_date = null) => {
    converted_status = status.toUpperCase().replace(/ /g, "_");

    // get the corresponding stage based on status
    let stage = updateStage(converted_status);

    try {
        // Get the current status before updating
        let getPreviousStatusSQL = "SELECT status FROM ats_applicant_progress WHERE progress_id = ?";
        const [previousStatusResult] = await pool.execute(getPreviousStatusSQL, [progress_id]);
        const previousStatus = previousStatusResult.length > 0 ? previousStatusResult[0].status : null;

        // Update status of applicant
        let sql = "UPDATE ats_applicant_progress SET stage = ?, status = ?, updated_at = NOW() WHERE progress_id = ?";
        let values = [
            stage,
            converted_status,
            progress_id
        ];

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
                VALUES (?, ?, ?, ?, ?, ${change_date ? '?' : 'NOW()'})
            `;

            let historyValues = [
                historyId,
                progress_id,
                previousStatus,
                converted_status,
                user_id
            ];

            // Add the custom date if provided
            if (change_date && change_date !== "N/A") {
                historyValues.push(change_date);
            }

            await pool.execute(insertHistorySQL, historyValues);
        }

        return true;
    } catch (error) {
        console.log(error.message);
        return false;
    }
};

const updateStage = (status) => {
    let pre_screening = ["UNPROCESSED", "PRE_SCREENING", "TEST_SENT"];
    let interview_schedule = ["INTERVIEW_SCHEDULE_SENT", "PHONE_INTERVIEW", "FIRST_INTERVIEW", "SECOND_INTERVIEW", "THIRD_INTERVIEW", "FOURTH_INTERVIEW", "FOLLOW_UP_INTERVIEW", "FINAL_INTERVIEW"];
    let job_offer = ["FOR_DECISION_MAKING", "FOR_JOB_OFFER", "JOB_OFFER_REJECTED", "JOB_OFFER_ACCEPTED", "FOR_FUTURE_POOLING"];
    let unsuccessful =["WITHDREW_APPLICATION","GHOSTED", "BLACKLISTED", "NOT_FIT"];

    if (status == pre_screening.includes(status)) {
        return "PRE_SCREENING";
    }
    else if (interview_schedule.includes(status)) {
        return "INTERVIEW_SCHEDULE";
    }
    else if (job_offer.includes(status)) {
        return "JOB_OFFER";
    }
    else if (unsuccessful.includes(status)) {
        return "UNSUCCESSFUL";
    }
    else {
        return "PRE_SCREENING";
    }
};

exports.updateApplicantStatus = async (req, res) => {
    const { progress_id, applicant_id, user_id, status, change_date, previous_status } = req.body;

    const isSuccess = await updateStatus(progress_id, user_id, status, change_date);
    if (isSuccess) {
        //if send test assessment email if pre-screening to test-sent
        if (status.toUpperCase() == "TEST_SENT") {
            //send email
            const response = emailController.emailTestAssessment(applicant_id, user_id); 
            if (response == null){
                //response is null
                return res.status(201).json({ message: "Successfully updated status of applicant", test_assessment: "Failed to send test assessment" });
            }
        }
        return res.status(201).json({ message: "Successfully updated status of applicant" });
    }
    return res.status(500).json({ message: "Failed to update status of applicant" });
};