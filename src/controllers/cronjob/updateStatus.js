const cron = require("node-cron")
const pool = require("../../config/db");
const { differenceInMonths } = require("date-fns");
const { v4: uuidv4 } = require("uuid");
const notificationController = require("../../controllers/notification/notificationController");
const getBlackListedApplicants = async () => {
    const sql = `
                SELECT * 
                FROM ats_applicants a
                INNER JOIN ats_applicant_trackings at USING (applicant_id)
                INNER JOIN ats_applicant_progress ap USING (progress_id)
                WHERE ap.status = 'BLACKLISTED';
    `;

    try {
        const [results, fields] = await pool.execute(sql);
        return results
    } catch (error) {
        console.error(error);
        return [];
    }
}

const updateStatus = async (applicant) => {
    try {
        const sql = `
            UPDATE ats_applicant_progress 
            SET stage=?, status=?, blacklisted_type=?, reason=?
            WHERE progress_id = ?
        `;
        const values = ['PRE_SCREENING', 'UNPROCESSED', null, null, applicant.progress_id];
        await pool.execute(sql, values);

        return true
    } catch (error) {
        console.log(error);
        return false
    }
}

const checkDateElapsed = (applicant) => {
    try {
        if (applicant.blacklisted_type == "SOFT") {
            //differences in dates
            const updated_at = new Date(applicant.updated_at);
            const current_date = new Date();
            const difference = differenceInMonths(current_date, updated_at);

            if (difference >= 6) {
                return true
            }
        }
        else if (applicant.blacklisted_type == "HARD") {
            //differences in dates
            const updated_at = new Date(applicant.updated_at);
            const current_date = new Date();
            const difference = differenceInMonths(current_date, updated_at);

            if (difference >= 12) {
                return true
            }
        }
        else {
            return false;
        }
    } catch (error) {
        console.log(error)
    }
}


const updateStatusCronJob = () => {
    /*
    get blacklisted applicants
    check 
        if 6 or 12 months has elapsed
            update 
            add to notification
            sent email
    */

    //run every 10 seconds
    cron.schedule("0 0 * * *", async () => {
        console.log("scheduled job is runnning...");
        try {
            const blacklistedApplicants = await getBlackListedApplicants();

            //check
            for (const applicant of blacklistedApplicants) {
                if (checkDateElapsed(applicant)) {
                    await updateStatus(applicant);

                    //sent to notification
                    const success = await notificationController.addNotification(applicant.applicant_id, "BLACKLISTED LIFTED");

                    if (success) {
                        console.log("blacklisted status lifted");
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    });
}


module.exports = updateStatusCronJob;