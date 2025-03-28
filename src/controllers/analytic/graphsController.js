const pool = require("../../config/db");

const getRequisitionData = async (filter, groupBy) => {
    try {
        const selectColumn = groupBy === 'year' ? 'YEAR(p.updated_at)' : 'MONTHNAME(p.updated_at)';
        const groupColumn = groupBy === 'year' ? 'YEAR(p.updated_at)' : 'MONTHNAME(p.updated_at), MONTH(p.updated_at) ';
        const orderColumn = groupBy === 'year' ? 'YEAR(p.updated_at)' : 'MONTH(p.updated_at)';
        
        const sql = `
            SELECT
                ${selectColumn} AS label,
                COUNT(CASE WHEN p.status IN ('JOB_OFFER_ACCEPTED', 'JOB_OFFER_REJECTED', 'WITHDREW_APPLICATION', 'BLACKLISTED', 'NOT_FIT') THEN 1 END) AS closed, 
                COUNT(CASE WHEN p.status = 'JOB_OFFER_ACCEPTED' THEN 1 END) AS passed,
                COUNT(CASE WHEN p.status NOT IN ('JOB_OFFER_ACCEPTED', 'JOB_OFFER_REJECTED', 'WITHDREW_APPLICATION', 'BLACKLISTED', 'NOT_FIT') THEN 1 END) AS onProgress
            FROM ats_applicant_progress p
            INNER JOIN ats_applicant_trackings t ON t.progress_id = p.progress_id
            INNER JOIN sl_company_jobs j ON j.job_id = t.position_id
            ${filter.position ? `WHERE j.title = ?` : ''}
            GROUP BY ${groupColumn}
            ORDER BY ${orderColumn};
        `;

        const queryParams = filter.position ? [filter.position] : [];
        const [results] = await pool.execute(sql, queryParams);
        return results;
    } catch (error) {
        console.error(error.message);
        return [];
    }
};

exports.requisition = async (req, res) => {
    const filter = req.query;
    let results = [];

    if (filter.month) {
        results = await getRequisitionData(filter, 'month');
    } else if (filter.year) {
        results = await getRequisitionData(filter, 'year');
    } else {
        results = await getRequisitionData(filter, 'all');
    }

    res.status(200).json({ message: "okay", requisition: results });
};

exports.source = async (req, res) => {
    try {
        const sql = `
            SELECT discovered_at AS source, COUNT(*) AS value
            FROM ats_applicants
            GROUP BY discovered_at;
        `;
        
        const [results] = await pool.execute(sql);
        res.status(200).json({ message: "okay", source: results });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.topAppliedJobs = async (req, res) => {
    try {
        // Get total number of applications
        const totalSql = `
            SELECT COUNT(*) AS total 
            FROM ats_applicant_trackings
        `;
        
        const [totalResult] = await pool.execute(totalSql);
        const totalApplications = totalResult[0]?.total || 0;
        
        if (totalApplications === 0) {
            return res.status(200).json({ 
                message: "okay", 
                data: { total: 0, jobs: [] }
            });
        }
        
        // Get application count and percentage per job
        const jobsSql = `
            SELECT 
                j.job_id,
                j.title AS job_title,
                COUNT(t.tracking_id) AS application_count,
                (COUNT(t.tracking_id) / ?) * 100 AS percentage
            FROM ats_applicant_trackings t
            INNER JOIN sl_company_jobs j ON j.job_id = t.position_id
            GROUP BY j.job_id, j.title
            ORDER BY percentage DESC
        `;
        
        const [jobs] = await pool.execute(jobsSql, [totalApplications]);
        
        res.status(200).json({
            message: "okay",
            data: {
                total: totalApplications,
                jobs: jobs
            }
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

exports.applicationTrend = async (req, res) => {
    try {
        let sql = `
            SELECT 
                YEAR(t.created_at) AS year, 
                MONTHNAME(t.created_at) AS month, 
                MONTH(t.created_at) AS month_number, 
                COUNT(*) AS count
            FROM ats_applicant_trackings t
            GROUP BY year, month, month_number
            ORDER BY year, month_number
        `;

        const [trend] = await pool.execute(sql);

        // Transform data into the desired format
        const result = {};
        trend.forEach(({ year, month, count }) => {
            if (!result[year]) {
                result[year] = [];
            }
            result[year].push({ month, count });
        });

        // Fetch total applications count
        sql = `SELECT COUNT(*) AS total FROM ats_applicant_trackings`;
        const [[{ total }]] = await pool.execute(sql);

        res.status(200).json({ message: "okay", data: { total, trend: result } });
    } catch (error) {
        console.error("Error in applicationTrend:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


exports.applicantSources = async (req, res) => {
    try {
        // Query to count internal referrals vs external applicants
        const sql = `
            SELECT 
                CASE 
                    WHEN discovered_at = 'REFERRAL' THEN 'Internal Referral'
                    ELSE 'External' 
                END AS source_type,
                COUNT(*) AS count,
                (COUNT(*) / (SELECT COUNT(*) FROM ats_applicants)) * 100 AS percentage
            FROM ats_applicants
            GROUP BY source_type
            ORDER BY count DESC
        `;
        
        const [results] = await pool.execute(sql);
        
        // Calculate total applicants
        const totalSql = `SELECT COUNT(*) AS total FROM ats_applicants`;
        const [totalResult] = await pool.execute(totalSql);
        const totalApplicants = totalResult[0]?.total || 0;
        
        // Format response with detailed breakdown
        const formattedResults = {
            total: totalApplicants,
            sources: results
        };
        
        res.status(200).json({ 
            message: "okay", 
            data: formattedResults 
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    }
};

exports.dropoffRate = async (req, res) => {
    try {
        // Get monthly data for total applicants and those with job offers accepted
        const monthlySql = `
            SELECT 
                MONTHNAME(updated_at) AS month,
                MONTH(updated_at) AS month_num,
                YEAR(updated_at) AS year,
                COUNT(*) AS total_applicants,
                COUNT(CASE WHEN status = 'JOB_OFFER_ACCEPTED' THEN 1 END) AS offers_accepted,
                (COUNT(CASE WHEN status = 'JOB_OFFER_ACCEPTED' THEN 1 END) / COUNT(*)) * 100 AS acceptance_rate,
                (COUNT(*) - COUNT(CASE WHEN status = 'JOB_OFFER_ACCEPTED' THEN 1 END)) AS dropped_off,
                ((COUNT(*) - COUNT(CASE WHEN status = 'JOB_OFFER_ACCEPTED' THEN 1 END)) / COUNT(*)) * 100 AS dropoff_rate
            FROM ats_applicant_progress
            GROUP BY YEAR(updated_at), MONTH(updated_at), MONTHNAME(updated_at)
            ORDER BY YEAR(updated_at), MONTH(updated_at)
        `;
        
        const [monthlyData] = await pool.execute(monthlySql);
        
        // Get overall totals for comparison
        const totalSql = `
            SELECT 
                COUNT(*) AS total_applicants,
                COUNT(CASE WHEN status = 'JOB_OFFER_ACCEPTED' THEN 1 END) AS offers_accepted,
                (COUNT(CASE WHEN status = 'JOB_OFFER_ACCEPTED' THEN 1 END) / COUNT(*)) * 100 AS acceptance_rate,
                (COUNT(*) - COUNT(CASE WHEN status = 'JOB_OFFER_ACCEPTED' THEN 1 END)) AS dropped_off,
                ((COUNT(*) - COUNT(CASE WHEN status = 'JOB_OFFER_ACCEPTED' THEN 1 END)) / COUNT(*)) * 100 AS dropoff_rate
            FROM ats_applicant_progress
        `;
        
        const [totalResults] = await pool.execute(totalSql);
        
        res.status(200).json({
            message: "okay",
            data: {
                overall: totalResults[0] || {
                    total_applicants: 0,
                    offers_accepted: 0,
                    acceptance_rate: 0,
                    dropped_off: 0,
                    dropoff_rate: 0
                },
                monthlyData: monthlyData
            }
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: error.message });
    }
};