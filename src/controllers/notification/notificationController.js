const pool = require("../../config/db");
const { v4: uuidv4 } = require("uuid");

// localhost:5000/notification
const generalNotification = async () => {
    const sql = `
        SELECT 
            n.*,
            a.first_name,
            a.middle_name,
            a.last_name,
            t.created_at AS date_applied,
            t.updated_at AS date_update, 
            t.updated_by, 
            p.*,
            j.title
        FROM ats_notifications n
        LEFT JOIN ats_applicants a ON n.applicant_id = a.applicant_id
        LEFT JOIN ats_applicant_trackings t ON a.applicant_id = t.applicant_id
        LEFT JOIN sl_company_jobs j ON j.job_id = t.position_id
        LEFT JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
        WHERE n.is_viewed = 0
        LIMIT 50
    `;

    try {
        const [rows] = await pool.execute(sql);
        return rows;
    } catch (error) {
        console.error("Error fetching general notifications:", error);
        return [];
    }
};

const atsHealthCheckNotification = async () => {
    const sql = `
        SELECT a.*, 
            t.updated_at,
            t.created_at AS date_created,
            j.title, 
            p.stage, 
            p.status
        FROM ats_applicants a
        JOIN ats_applicant_trackings t ON a.applicant_id = t.applicant_id
        LEFT JOIN sl_company_jobs j ON j.job_id = t.position_id
        LEFT JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
        WHERE t.updated_at < NOW() - INTERVAL 3 DAY 
        AND p.status NOT IN ('FOR_JOB_OFFER', 'JOB_OFFER_REJECTED', 'JOB_OFFER_ACCEPTED', 'FOR_FUTURE_POOLING', 'WITHDREW_APPLICATION', 'BLACKLISTED', 'GHOSTED', 'NOT_FIT')
        LIMIT 50
    `;
    try {
        const [rows] = await pool.query(sql);
        return rows;
    } catch (error) {
        console.error("Error fetching ATS health check notifications:", error);
        return [];
    }
};

// Remove the cleanup function from the main getNotification flow
// We'll only run cleanup manually or on a schedule, not on every fetch

exports.addNotification = async (applicant_id, notification_type) => {
    try {
        const notification_id = uuidv4();

        const sql = `
        INSERT INTO ats_notifications (notification_id, applicant_id, notification_type)
        VALUES (?, ?, ?)
    `;

        const values = [notification_id, applicant_id, notification_type];
        await pool.execute(sql, values);
        return true;
    } catch (error) {
        console.log(error.message);
        return false;
    }
}

exports.removeFromNotification = async (req, res) => {
    const applicant_id = req.params.applicant_id;

    try {
        await pool.execute(`UPDATE ats_notifications SET is_viewed = 1 WHERE applicant_id = ?`, [applicant_id]);
        return res.status(200).json({ message: "removed notification active status" });
    } catch (error) {
        console.error('DB error:', error);
        return res.status(500).json({ message: "Server error" });
    }
};

exports.getNotification = async (req, res) => {
    try {
        // DON'T run cleanup here - we want to show all notifications including old ones
        // The frontend will handle filtering recent vs old notifications
        
        const general = await generalNotification();
        const ats = await atsHealthCheckNotification();

        res.status(200).json({ message: "okay", general, ats });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// Optional: Manual cleanup function that can be called separately
exports.cleanupOldNotifications = async (req, res) => {
    try {
        const sql = `
            UPDATE ats_notifications n
            JOIN ats_applicant_trackings t ON n.applicant_id = t.applicant_id
            SET n.is_viewed = 1 
            WHERE t.created_at < NOW() - INTERVAL 30 DAY 
            AND n.is_viewed = 0
        `;
        
        await pool.execute(sql);
        return res.status(200).json({ message: "Old notifications cleaned up" });
    } catch (error) {
        console.error("Error cleaning up old notifications:", error);
        return res.status(500).json({ message: "Cleanup failed" });
    }
};

// Optional: Function to run cleanup on a schedule (not on every fetch)
exports.scheduledCleanup = async () => {
    try {
        const sql = `
            UPDATE ats_notifications n
            JOIN ats_applicant_trackings t ON n.applicant_id = t.applicant_id
            SET n.is_viewed = 1 
            WHERE t.created_at < NOW() - INTERVAL 30 DAY 
            AND n.is_viewed = 0
        `;
        
        await pool.execute(sql);
        console.log("Old notifications cleaned up via schedule");
    } catch (error) {
        console.error("Scheduled cleanup failed:", error);
    }
};