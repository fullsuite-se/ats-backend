const pool = require("../../config/db");

exports.getApplicantStatusHistory = async (req, res) => {
    const { progressId } = req.params;
    
    try {
        // Query to get status history with user names
        const sql = `
            SELECT h.*, u.first_name, u.last_name,
                   CONCAT(u.first_name, ' ', u.last_name) as user_name
            FROM ats_applicant_status_history h
            LEFT JOIN hris_user_infos u ON h.changed_by = u.user_id
            WHERE h.progress_id = ?
            ORDER BY h.changed_at ASC
        `;
        
        const [results] = await pool.execute(sql, [progressId]);
        
        return res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching status history:", error);
        return res.status(500).json({ 
            message: "Failed to fetch applicant status history",
            error: error.message
        });
    }
};