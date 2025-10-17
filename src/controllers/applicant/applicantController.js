const pool = require("../../config/db");
const applicantModel = require("../../models/applicant/applicantModel");

// /applicants/search?query?
exports.searchApplicant = async (req, res) => {
  try {
    const filters = req.query;

    const conditions = [];
    const values = [];

    if (filters.month) {
      conditions.push("MONTHNAME(a.date_created) = ?");
      values.push(filters.month);
    }
    if (filters.year) {
      conditions.push("YEAR(a.date_created) = ?");
      values.push(filters.year);
    }
    if (filters.position) {
      conditions.push("j.title LIKE ?");
      values.push(`%${filters.position}%`);
    }
    if (filters.searchQuery) {
      conditions.push(`(
                a.first_name LIKE ?
                 OR a.middle_name LIKE ? 
                 OR a.last_name LIKE ?
                 OR CONCAT(a.first_name, ' ', a.last_name) LIKE ?
                 OR c.email_1 LIKE ?
                 OR c.email_2 LIKE ?
                 OR c.email_3 LIKE ?
                 OR c.mobile_number_1 LIKE ?
                 OR c.mobile_number_2 LIKE ? 
                 )`);
      values.push(
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`,
        `%${filters.searchQuery}%`
      );
    }
    if (filters.status) {
      const statusArray = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      const placeholders = statusArray.map(() => "?").join(", ");
      conditions.push(`p.status IN (${placeholders})`);
      values.push(...statusArray);
    }

    // Ensure at least one condition to avoid syntax error in SQL
    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
            SELECT
                a.applicant_id, 
                a.first_name, 
                a.middle_name, 
                a.last_name,
                a.date_created, 
                t.created_at,
                p.status, 
                j.title, 
                p.progress_id
                FROM ats_applicants a
                LEFT JOIN ats_contact_infos c
                    ON a.applicant_id = c.applicant_id
                LEFT JOIN ats_applicant_trackings t
                    ON a.applicant_id = t.applicant_id
                LEFT JOIN ats_applicant_progress p
                    ON t.progress_id = p.progress_id
                LEFT JOIN sl_company_jobs j
                    ON t.position_id = j.job_id
            ${whereClause}
        `;

    const [results] = await pool.execute(sql, values);

    return res.json(results);
  } catch (error) {
    console.error("Error fetching applicants:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

//applicants/
exports.getAllApplicants = async (req, res) => {
  try {
    const results = await applicantModel.getAllApplicants();
    if (results) {
      return res.status(201).json(results);
    }
  } catch (error) {
    return res.status(500).json({ error: error });
  }
};

//applicants/
exports.getAllApplicantsPagination = async (req, res) => {
  try {

    // Extract pagination parameters from the request query
    let { page, limit } = req.query;
    page = parseInt(page) || 1; // Default page = 1
    limit = parseInt(limit) || 10; // Default limit = 10

    const offset = (page - 1) * limit;

    // SQL query with LIMIT and OFFSET for pagination
    const sql = `
            SELECT 
                a.applicant_id, 
                a.first_name, 
                a.middle_name, 
                a.last_name, 
                t.applicant_created_at, 
                p.status, 
                p.progress_id,
                j.title
            FROM ats_applicants a
            LEFT JOIN ats_applicant_trackings t ON a.applicant_id = t.applicant_id
            LEFT JOIN ats_applicant_progress p ON t.progress_id = p.progress_id
            LEFT JOIN sl_company_jobs j ON t.position_id = j.job_id
            LIMIT ? OFFSET ?;
        `;

    // Query to count total number of applicants
    const countSql = `SELECT COUNT(*) AS total FROM ats_applicants`;

    // Execute queries
    const [results] = await pool.query(sql, [limit, offset]);
    //const [results] = await pool.execute(sql);
    const [[{ total }]] = await pool.execute(countSql);

    // Return paginated results with metadata
    return res.status(200).json({
      applicants: results,
      totalApplicants: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getApplicantsFilter = async (req, res) => {
  const filters = req.query;
  const conditions = [];
  const values = [];

  if (filters.month) {
    conditions.push("MONTHNAME(t.created_at)= ?");
    values.push(filters.month);
  }
  if (filters.year) {
    conditions.push("YEAR(t.created_at) = ?");
    values.push(filters.year);
  }
 if (filters.position) {
    conditions.push("j.title = ?"); // Remove LIKE, use exact match
    values.push(filters.position);
}
  if (filters.status) {
    const statusArray = Array.isArray(filters.status)
      ? filters.status
      : [filters.status];
    const placeholders = statusArray.map(() => "?").join(", ");
    conditions.push(`p.status IN (${placeholders})`);
    values.push(...statusArray);
  }

  // Construct SQL query
  const baseSql = `
      SELECT
        a.*,
        c.*, 
        p.stage, 
        p.status, 
        j.title, 
        p.progress_id,
        t.created_at
      FROM ats_applicants a
      LEFT JOIN ats_contact_infos c
        ON a.applicant_id = c.applicant_id
      LEFT JOIN ats_applicant_trackings t
        ON a.applicant_id = t.applicant_id
      LEFT JOIN ats_applicant_progress p
        ON t.progress_id = p.progress_id
      LEFT JOIN sl_company_jobs j
        ON t.position_id = j.job_id
    `;

  // Add WHERE clause if filters exist
  const sql =
    conditions.length > 0
      ? `${baseSql} WHERE ${conditions.join(" AND ")} ORDER BY t.created_at DESC`
      : baseSql;

  try {
    const [results] = await pool.execute(sql, values);
    return res.json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// NEW FUNCTION: Get first-time job seekers only
exports.getFirstTimeJobSeekers = async (req, res) => {
  try {
    const filters = req.query;
    const results = await applicantModel.getFirstTimeJobSeekers(filters);

    return res.json({
      firstTimeJobSeekers: results,
      totalCount: results.length,
      message: "First-time job seekers retrieved successfully"
    });
  } catch (error) {
    console.error("Error fetching first-time job seekers:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// NEW FUNCTION: Get first-time job seekers with pagination
exports.getFirstTimeJobSeekersPagination = async (req, res) => {
  try {
    const filters = req.query;
    let { page, limit } = req.query;
    
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    const result = await applicantModel.getFirstTimeJobSeekersPaginated(filters, page, limit);

    return res.status(200).json({
      firstTimeJobSeekers: result.applicants,
      totalApplicants: result.totalApplicants,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    });
  } catch (error) {
    console.error("Error fetching first-time job seekers with pagination:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getApplicant = async (req, res) => {
  try {
    const applicant_id = req.params.applicant_id;

    const results = await applicantModel.getApplicant(applicant_id);

    if (results.length > 0) {
      return res.status(200).json(results);
    }

    res.status(404).json({ message: "Applicant not found" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

exports.getApplicantsFilterForExelExport = async (req, res) => {

  const filters = req.query;
  const conditions = [];
  const values = [];

  if (filters.month) {
    conditions.push("MONTHNAME(t.created_at)= ?");
    values.push(filters.month);
  }
  if (filters.year) {
    conditions.push("YEAR(t.created_at) = ?");
    values.push(filters.year);
  }
  if (filters.position) {
    if (filters.position != "All") {
      conditions.push("j.title LIKE ?");
      values.push(`%${filters.position}%`);
    }
  }
  if (filters.status) {
    const statusArray = Array.isArray(filters.status)
      ? filters.status
      : [filters.status];
    const placeholders = statusArray.map(() => "?").join(", ");
    conditions.push(`p.status IN (${placeholders})`);
    values.push(...statusArray);
  }

  // Construct SQL query
  const baseSql = `
      SELECT
        t.created_at as date_applied,
        a.first_name,
        a.middle_name,
        a.last_name,
        c.email_1, 
        c.email_2, 
        c.email_3,
        c.mobile_number_1,
        c.mobile_number_2,
        a.cv_link, 
        a.discovered_at,
        t.applied_source as source,
        j.title as position_applied,
        t.test_result,
        p.status,
        a.date_created, 
        t.referrer_name,
        p.blacklisted_type,
        p.reason
      FROM ats_applicants a
      LEFT JOIN ats_contact_infos c
        ON a.applicant_id = c.applicant_id
      LEFT JOIN ats_applicant_trackings t
        ON a.applicant_id = t.applicant_id
      LEFT JOIN ats_applicant_progress p
        ON t.progress_id = p.progress_id
      LEFT JOIN sl_company_jobs j
        ON t.position_id = j.job_id
    `;

  // Add WHERE clause if filters exist
  const sql =
    conditions.length > 0
      ? `${baseSql} WHERE ${conditions.join(" AND ")} ORDER BY t.created_at DESC`
      : baseSql;

  try {
    const [results] = await pool.execute(sql, values);
    return res.json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.deleteApplicant = async (req, res) => {
  try {
    const { applicant_id } = req.params;

    if (!applicant_id) {
      return res.status(400).json({ message: "Applicant ID is required" });
    }

    const deleted = await applicantModel.deleteApplicant(applicant_id);

    if (deleted) {
      return res
        .status(200)
        .json({ message: "Applicant deleted successfully", applicant_id });
    } else {
      return res.status(404).json({ message: "Applicant not found" });
    }
  } catch (error) {
    console.error("Error deleting applicant:", error);
    res
      .status(500)
      .json({ message: "Error deleting applicant", error: error.message });
  }
};


exports.getApplicantsFirstTimeJobSeekersFilter = async (req, res) => {
  try {
    const { position, status, date, dateType } = req.query;
    
    let sql = `
      SELECT DISTINCT a.*, p.title, pr.status, pr.progress_id 
      FROM applicants a
      LEFT JOIN positions p ON a.position_id = p.position_id
      LEFT JOIN (
        SELECT applicant_id, status, progress_id,
               ROW_NUMBER() OVER (PARTITION BY applicant_id ORDER BY progress_id DESC) as rn
        FROM progress
      ) pr ON a.applicant_id = pr.applicant_id AND pr.rn = 1
      WHERE a.is_first_time_jobseeker = true
    `;
    
    const params = [];
    let paramCount = 0;

    if (position && position !== 'All') {
      paramCount++;
      sql += ` AND p.title = $${paramCount}`;
      params.push(position);
    }

    if (date && date !== 'Invalid date') {
      paramCount++;
      if (dateType === 'month') {
        sql += ` AND TO_CHAR(a.created_at, 'Month') = $${paramCount}`;
      } else if (dateType === 'year') {
        sql += ` AND EXTRACT(YEAR FROM a.created_at) = $${paramCount}`;
      }
      params.push(date);
    }

    if (status && status.length > 0) {
      const statusPlaceholders = status.map((_, index) => {
        paramCount++;
        return `$${paramCount}`;
      }).join(',');
      sql += ` AND pr.status IN (${statusPlaceholders})`;
      params.push(...status);
    }

    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error filtering first-time job seekers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
