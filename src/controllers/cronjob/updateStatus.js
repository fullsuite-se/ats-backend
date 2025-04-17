const cron = require("node-cron")
const pool = require("../../config/db");
const { differenceInMonths } = require("date-fns");
const { v4: uuidv4 } = require("uuid");

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


const addNotification = async (data) => {
    try {
        const notification_id = uuidv4();

        const sql = `
            INSERT INTO ats_notifications (notification_id, notification_type, applicant_id) VALUES (?, ?, ?)
        `;
        const values = [notification_id, data.notification_type, data.applicant_id]

        await pool.execute(sql, values);
        return true;
    } catch (error) {
        console.log(error);
        return false
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
    cron.schedule("*/10 * * * * *", async () => {
        console.log("scheduled job is runnning...");
        try {
            const blacklistedApplicants = await getBlackListedApplicants();

            //check
            blacklistedApplicants.forEach(applicant => {
                if (checkDateElapsed(applicant)) {
                    updateStatus(applicant);

                    //sent to notification
                    const data = { notification_type: "BLACKLISTED LIFTED", applicant_id: applicant.applicant_id }
                    if (addNotification(data)) {
                        console.log("blacklisted status lifted");
                    }

                }
            });
        } catch (error) {
            console.log(error);
        }
    });


}


module.exports = updateStatusCronJob;