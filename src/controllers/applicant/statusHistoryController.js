const pool = require("../../config/db");
const { now } = require("../../utils/date");

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
  const { changed_at, edited, deleted, status, changed_by } = req.body;

  console.log("Request body:", req.body);

  try {
    const sql = `
        UPDATE ats_applicant_status_history
        SET status =?, edited = ?, deleted = ?, changed_by = ?, changed_at = ?
        WHERE history_id = ?
      `;

    const [result] = await pool.execute(sql, [
      status,
      edited,
      deleted,
      changed_by,
      changed_at,
      id,
    ]);

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

exports.softDeleteApplicantStatusHistory = async (req, res) => {
  const { id } = req.params;
  const { deleted, changed_by } = req.body;

  try {
    const sql = `
        UPDATE ats_applicant_status_history
        SET deleted = ?, changed_by = ?, changed_at = ?
        WHERE history_id = ?
      `;

    const [result] = await pool.execute(sql, [deleted, changed_by, now(), id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Record not found" });
    }

    return res
      .status(200)
      .json({ message: "Status history deleted successfully" });
  } catch (error) {
    console.error("Error deleting status history:", error);
    return res.status(500).json({
      message: "Failed to delete status history",
      error: error.message,
    });
  }
};
