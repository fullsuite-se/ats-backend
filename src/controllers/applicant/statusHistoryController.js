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
            ORDER BY h.changed_at DESC
        `;

    const [results] = await pool.execute(sql, [progressId]);
    console.log("Status history results:", results);

    return res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching status history:", error);
    return res.status(500).json({
      message: "Failed to fetch applicant status history",
      error: error.message,
    });
  }
};

exports.updateApplicantStatusHistory = async (req, res) => {
  const { id } = req.params;
  const { changed_at } = req.body;

  console.log("Request body:", changed_at);

  try {
    const sql = `
        UPDATE ats_applicant_status_history
        SET changed_at = ?
        WHERE history_id = ?
      `;

    const [result] = await pool.execute(sql, [changed_at, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Record not found" });
    }

    return res
      .status(200)
      .json({ message: "Status history updated successfully" });
  } catch (error) {
    console.error("Error updating status history:", error);
    return res.status(500).json({
      message: "Failed to update status history",
      error: error.message,
    });
  }
};
