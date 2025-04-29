const pool = require("../../config/db");
const requisitionModel = require("../../models/analytic/requisitionModel");

/*
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

    res.status(200).json({
        message: "okay",
        filters: {
            month: filter.month || null,
            year: filter.year || null,
            position: filter.position || null
        },
        requisition: results
    });
};
*/


exports.requisition = async (req, res) => {
    try {
        const { month, year, position_id } = req.query;
        const requisition = await requisitionModel.getRequisitionData(month, year, position_id);
        return res.status(200).json({ requisition: requisition });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
}

exports.source = async (req, res) => {
    try {
        const { month, year } = req.query;

        // Build WHERE clause based on filters
        let whereClause = '';
        let queryParams = [];

        if (month && year) {
            whereClause = 'WHERE MONTH(t.created_at) = ? AND YEAR(t.created_at) = ?';
            queryParams = [parseInt(month), parseInt(year)];
        } else if (month) {
            whereClause = 'WHERE MONTH(t.created_at) = ?';
            queryParams = [parseInt(month)];
        } else if (year) {
            whereClause = 'WHERE YEAR(t.created_at) = ?';
            queryParams = [parseInt(year)];
        }

        const sql = `
            SELECT discovered_at AS source, COUNT(*) AS value
            FROM ats_applicants a
            JOIN ats_applicant_trackings t ON a.applicant_id = t.applicant_id
            ${whereClause}
            GROUP BY discovered_at
            ORDER BY value DESC;
        `;


        const [results] = await pool.execute(sql, queryParams);

        res.status(200).json({
            message: "okay",
            filters: {
                month: month || null,
                year: year || null
            },
            source: results
        });
    } catch (error) {
        console.error("Error in source:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.topAppliedJobs = async (req, res) => {
    try {
        const { month, year } = req.query;

        // Build WHERE clause based on filters
        let whereClause = '';
        let queryParams = [];

        if (month && year) {
            whereClause = 'WHERE MONTH(t.created_at) = ? AND YEAR(t.created_at) = ?';
            queryParams = [parseInt(month), parseInt(year)];
        } else if (month) {
            whereClause = 'WHERE MONTH(t.created_at) = ?';
            queryParams = [parseInt(month)];
        } else if (year) {
            whereClause = 'WHERE YEAR(t.created_at) = ?';
            queryParams = [parseInt(year)];
        }

        // Get total number of applications with filters
        const totalSql = `
            SELECT COUNT(*) AS total 
            FROM ats_applicant_trackings t
            ${whereClause}
        `;

        const [totalResult] = await pool.execute(totalSql, queryParams);
        const totalApplications = totalResult[0]?.total || 0;

        if (totalApplications === 0) {
            return res.status(200).json({
                message: "okay",
                filters: {
                    month: month || null,
                    year: year || null
                },
                data: { total: 0, jobs: [] }
            });
        }

        // Get application count and percentage per job with filters
        const jobsSql = `
            SELECT 
                j.job_id,
                j.title AS job_title,
                COUNT(t.tracking_id) AS application_count,
                (COUNT(t.tracking_id) / ?) * 100 AS percentage
            FROM ats_applicant_trackings t
            INNER JOIN sl_company_jobs j ON j.job_id = t.position_id
            ${whereClause}
            GROUP BY j.job_id, j.title
            ORDER BY percentage DESC
        `;

        // Add totalApplications at the beginning of params
        const jobParams = [totalApplications, ...queryParams];


        const [jobs] = await pool.execute(jobsSql, jobParams);

        res.status(200).json({
            message: "okay",
            filters: {
                month: month || null,
                year: year || null
            },
            data: {
                total: totalApplications,
                jobs: jobs
            }
        });
    } catch (error) {
        console.error("Error in topAppliedJobs:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.applicationTrend = async (req, res) => {
    try {
        const { month, year } = req.query;

        let whereClause = '';
        let queryParams = [];

        if (month && year) {
            whereClause = 'WHERE MONTH(t.created_at) = ? AND YEAR(t.created_at) = ?';
            queryParams = [parseInt(month), parseInt(year)];
        } else if (month) {
            whereClause = 'WHERE MONTH(t.created_at) = ?';
            queryParams = [parseInt(month)];
        } else if (year) {
            whereClause = 'WHERE YEAR(t.created_at) = ?';
            queryParams = [parseInt(year)];
        }

        let sql = `
            SELECT 
                YEAR(t.created_at) AS year, 
                MONTHNAME(t.created_at) AS month, 
                MONTH(t.created_at) AS month_number, 
                COUNT(*) AS count
            FROM ats_applicant_trackings t
            ${whereClause}
            GROUP BY year, month, month_number
            ORDER BY year, month_number
        `;

        console.log('Application Trend Query:', sql, 'Params:', queryParams);
        const [trend] = await pool.execute(sql, queryParams);

        // Transform data into the desired format
        const result = {};
        trend.forEach(({ year, month, count }) => {
            if (!result[year]) {
                result[year] = [];
            }
            result[year].push({ month, count });
        });

        // Fetch total applications count with the same filters
        const totalSql = `SELECT COUNT(*) AS total FROM ats_applicant_trackings t ${whereClause}`;
        console.log('Application Trend Total Query:', totalSql, 'Params:', queryParams);

        const [[{ total }]] = await pool.execute(totalSql, queryParams);

        res.status(200).json({
            message: "okay",
            filters: {
                month: month || null,
                year: year || null
            },
            data: { total, trend: result }
        });
    } catch (error) {
        console.error("Error in applicationTrend:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

exports.applicantSources = async (req, res) => {
    try {
        const { month, year } = req.query;

        let whereClause = '';
        let queryParams = [];

        // Fix: Use proper created_at field reference
        // Use t.created_at from ats_applicant_trackings table
        if (month && year) {
            whereClause = 'WHERE MONTH(t.created_at) = ? AND YEAR(t.created_at) = ?';
            queryParams = [parseInt(month), parseInt(year)];
        } else if (month) {
            whereClause = 'WHERE MONTH(t.created_at) = ?';
            queryParams = [parseInt(month)];
        } else if (year) {
            whereClause = 'WHERE YEAR(t.created_at) = ?';
            queryParams = [parseInt(year)];
        }

        // Calculate total applicants for the given period
        const totalSql = `
            SELECT COUNT(*) AS total 
            FROM ats_applicants a
            JOIN ats_applicant_trackings t ON a.applicant_id = t.applicant_id
            ${whereClause}
        `;

        console.log('Applicant Sources Total Query:', totalSql, 'Params:', queryParams);
        const [totalResult] = await pool.execute(totalSql, queryParams);
        const totalApplicants = totalResult[0]?.total || 0;

        if (totalApplicants === 0) {
            return res.status(200).json({
                message: "okay",
                filters: {
                    month: month || null,
                    year: year || null
                },
                data: { total: 0, sources: [] }
            });
        }

        // Fix: Update the CASE statement to handle all possible values
        // and use IFNULL to protect against NULL values
        const sourcesSql = `
            SELECT 
                CASE 
                    WHEN IFNULL(a.discovered_at, '') = 'REFERRAL' THEN 'Internal Referral'
                    WHEN IFNULL(a.discovered_at, '') = 'WALK_IN' THEN 'Internal Walk-in'
                    ELSE 'External Application' 
                END AS source_type,
                COUNT(*) AS count,
                ROUND((COUNT(*) / ?) * 100, 2) AS percentage
            FROM ats_applicants a
            JOIN ats_applicant_trackings t ON a.applicant_id = t.applicant_id
            ${whereClause}
            GROUP BY source_type
            ORDER BY count DESC
        `;

        // Put totalApplicants as first param
        const sourceParams = [totalApplicants, ...queryParams];
        console.log('Applicant Sources Query:', sourcesSql, 'Params:', sourceParams);

        const [results] = await pool.execute(sourcesSql, sourceParams);

        // Format response with detailed breakdown
        const formattedResults = {
            total: totalApplicants,
            sources: results.map(source => ({
                ...source,
                percentage: parseFloat(source.percentage).toFixed(2) + '%'
            }))
        };

        res.status(200).json({
            message: "okay",
            filters: {
                month: month || null,
                year: year || null
            },
            data: formattedResults
        });
    } catch (error) {
        console.error("Error in applicantSources:", error);
        res.status(500).json({ message: error.message });
    }
};
exports.dropoffRate = async (req, res) => {
    try {
        const { month, year } = req.query;

        let whereClause = '';
        let queryParams = [];

        if (month && year) {
            whereClause = 'WHERE MONTH(p.updated_at) = ? AND YEAR(p.updated_at) = ?';
            queryParams = [parseInt(month), parseInt(year)];
        } else if (month) {
            whereClause = 'WHERE MONTH(p.updated_at) = ?';
            queryParams = [parseInt(month)];
        } else if (year) {
            whereClause = 'WHERE YEAR(p.updated_at) = ?';
            queryParams = [parseInt(year)];
        }

        // Get monthly data for total applicants and those with job offers accepted
        const monthlySql = `
            SELECT 
                MONTHNAME(p.updated_at) AS month,
                MONTH(p.updated_at) AS month_num,
                YEAR(p.updated_at) AS year,
                COUNT(*) AS total_applicants,
                COUNT(CASE WHEN p.status = 'JOB_OFFER_ACCEPTED' THEN 1 END) AS offers_accepted,
                (COUNT(CASE WHEN p.status = 'JOB_OFFER_ACCEPTED' THEN 1 END) / COUNT(*)) * 100 AS acceptance_rate,
                (COUNT(*) - COUNT(CASE WHEN p.status = 'JOB_OFFER_ACCEPTED' THEN 1 END)) AS dropped_off,
                ((COUNT(*) - COUNT(CASE WHEN p.status = 'JOB_OFFER_ACCEPTED' THEN 1 END)) / COUNT(*)) * 100 AS dropoff_rate
            FROM ats_applicant_progress p
            ${whereClause}
            GROUP BY YEAR(p.updated_at), MONTH(p.updated_at), MONTHNAME(p.updated_at)
            ORDER BY YEAR(p.updated_at), MONTH(p.updated_at)
        `;

        console.log('Dropoff Rate Monthly Query:', monthlySql, 'Params:', queryParams);
        const [monthlyData] = await pool.execute(monthlySql, queryParams);

        // Get overall totals for comparison with the same filters
        const totalSql = `
            SELECT 
                COUNT(*) AS total_applicants,
                COUNT(CASE WHEN status = 'JOB_OFFER_ACCEPTED' THEN 1 END) AS offers_accepted,
                (COUNT(CASE WHEN status = 'JOB_OFFER_ACCEPTED' THEN 1 END) / COUNT(*)) * 100 AS acceptance_rate,
                (COUNT(*) - COUNT(CASE WHEN status = 'JOB_OFFER_ACCEPTED' THEN 1 END)) AS dropped_off,
                ((COUNT(*) - COUNT(CASE WHEN status = 'JOB_OFFER_ACCEPTED' THEN 1 END)) / COUNT(*)) * 100 AS dropoff_rate
            FROM ats_applicant_progress p
            ${whereClause}
        `;

        console.log('Dropoff Rate Total Query:', totalSql, 'Params:', queryParams);
        const [totalResults] = await pool.execute(totalSql, queryParams);

        res.status(200).json({
            message: "okay",
            filters: {
                month: month || null,
                year: year || null
            },
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
        console.error("Error in dropoffRate:", error);
        res.status(500).json({ message: error.message });
    }
};