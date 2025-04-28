const pool = require("../../config/db");

const f_applicationsReceived = async (month, year, position_id) => {
    try {
        let whereClause = '';
        let params = [];

        if (month || year || position_id) {
            const conditions = [];

            if (month) {
                conditions.push('MONTH(created_at) = ?');
                params.push(parseInt(month));
            }
            if (year) {
                conditions.push('YEAR(created_at) = ?');
                params.push(parseInt(year));
            }
            if (position_id) {
                conditions.push('position_id = ?');
                params.push(position_id);
            }

            whereClause = "WHERE " + conditions.join(" AND ")
        }


        const totalQuery = `SELECT COUNT(*) AS count 
                            FROM ats_applicant_trackings
                            ${whereClause}`;

        const [overall] = await pool.execute(totalQuery, params);
        return overall[0].count;
    } catch (error) {
        console.error(error);
        return null;
    }
};

const f_topJobs = async (month, year, position_id) => {
    try {
        let whereClause = 'WHERE ';
        let params = [];

        if (month && year) {
            whereClause += 'MONTH(a.created_at) = ? AND YEAR(a.created_at) = ?';
            params = [parseInt(month), parseInt(year)];
        } else if (month) {
            whereClause += 'MONTH(a.created_at) = ?';
            params = [parseInt(month)];
        } else if (year) {
            whereClause += 'YEAR(a.created_at) = ?';
            params = [parseInt(year)];
        }

        // Get total number of hires with filtering
        const totalHiresQuery = `
            SELECT COUNT(*) AS totalHires
            FROM ats_applicant_trackings a
            JOIN sl_company_jobs j ON a.position_id_id = j.job_id
            JOIN ats_applicant_progress p ON a.progress_id = p.progress_id
            ${whereClause}
        `;


        const [[{ totalHires }]] = await pool.execute(totalHiresQuery, params);

        // Top jobs query
        const topJobsQuery = `
            SELECT j.title, COUNT(a.applicant_id) AS hires
            FROM ats_applicant_trackings a
            JOIN sl_company_jobs j ON a.position_id_id = j.job_id
            JOIN ats_applicant_progress p ON a.progress_id = p.progress_id
            ${whereClause}
            GROUP BY j.title
            ORDER BY hires DESC
            LIMIT 4
        `;


        const [topJobs] = await pool.execute(topJobsQuery, params);

        return {
            formattedTopJobs: topJobs.map(job => ({
                title: job.title,
                hires: job.hires,
                percentage: totalHires
                    ? ((job.hires / totalHires) * 100).toFixed(2) + '%'
                    : '0%'
            })),
        };
    } catch (error) {
        console.error('Error fetching top jobs:', error);
        return null;
    }
};

const f_InternalExternalHires = async (month, year, position_id) => {
    try {
        let whereClause = 'WHERE p.status = \'JOB_OFFER_ACCEPTED\'';
        let params = [];

        if (month && year) {
            whereClause += ' AND MONTH(a.created_at) = ? AND YEAR(a.created_at) = ?';
            params = [parseInt(month), parseInt(year)];
        } else if (month) {
            whereClause += ' AND MONTH(a.created_at) = ?';
            params = [parseInt(month)];
        } else if (year) {
            whereClause += ' AND YEAR(a.created_at) = ?';
            params = [parseInt(year)];
        }

        const totalHiresQuery = `
            SELECT COUNT(*) AS totalHires 
            FROM ats_applicant_trackings a 
            JOIN ats_applicant_progress p ON a.progress_id = p.progress_id
            ${whereClause}`;

        const [[{ totalHires }]] = await pool.execute(totalHiresQuery, params);

        const internalQuery = `
            SELECT COUNT(*) AS internal_hires 
            FROM ats_applicant_trackings a 
            JOIN ats_applicant_progress p ON a.progress_id = p.progress_id
            ${whereClause} 
            AND a.applied_source IN ('Referral', 'Internship')`;

        console.log(internalQuery);

        const [internal] = await pool.execute(internalQuery, params);

        const externalQuery = `
            SELECT COUNT(*) AS external_hires 
            FROM ats_applicant_trackings a 
            JOIN ats_applicant_progress p ON a.progress_id = p.progress_id
            ${whereClause} 
            AND a.applied_source IN ('Indeed', 'LinkedIn', 'Social Media', 'Suitelife', 'Career Fair')`;


        const [external] = await pool.execute(externalQuery, params);


        return {
            internal: internal[0].internal_hires,
            external: external[0].external_hires,
            internalRate: totalHires ? (internal[0].internal_hires / totalHires) * 100 : 0,
            externalRate: totalHires ? (external[0].external_hires / totalHires) * 100 : 0,
            totalHires: totalHires,
        };
    } catch (error) {
        console.error(error);
        return null;
    }
};

const f_dropOffRate = async (month, year, position_id) => {
    try {
        let whereClause = '';
        let progressWhereClause = 'WHERE status IN (\'WITHDREW_APPLICATION\', \'JOB_OFFER_REJECTED\', \'BLACKLISTED\', \'NOT_FIT\')';
        let params = [];
        let progressParams = [];

        if (month && year) {
            whereClause = 'WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?';
            progressWhereClause += ' AND MONTH(updated_at) = ? AND YEAR(updated_at) = ?';
            params = [parseInt(month), parseInt(year)];
            progressParams = [parseInt(month), parseInt(year)];
        } else if (month) {
            whereClause = 'WHERE MONTH(created_at) = ?';
            progressWhereClause += ' AND MONTH(updated_at) = ?';
            params = [parseInt(month)];
            progressParams = [parseInt(month)];
        } else if (year) {
            whereClause = 'WHERE YEAR(created_at) = ?';
            progressWhereClause += ' AND YEAR(updated_at) = ?';
            params = [parseInt(year)];
            progressParams = [parseInt(year)];
        }

        // Get total number of applicants with filtering
        const totalApplicantsQuery = `SELECT COUNT(*) AS totalApplicants FROM ats_applicant_trackings ${whereClause}`;


        const [[{ totalApplicants }]] = await pool.execute(totalApplicantsQuery, params);

        if (totalApplicants === 0) {
            return {
                overallDropOffRate: '0%',
                monthlyDropOffs: [],
                allMonthlyDropOffs: []
            };
        }

        // Get drop-offs with filtering
        let dropOffsQuery = `
            SELECT COUNT(*) AS totalDropOffs 
            FROM ats_applicant_trackings a
            JOIN sl_company_jobs j ON a.position_id_id = j.job_id
            JOIN ats_applicant_progress p ON a.progress_id = p.progress_id
            WHERE p.status IN ('WITHDREW_APPLICATION', 'JOB_OFFER_REJECTED', 'BLACKLISTED', 'NOT_FIT')`;

        if (month && year) {
            dropOffsQuery += ' AND MONTH(a.created_at) = ? AND YEAR(a.created_at) = ?';
        } else if (month) {
            dropOffsQuery += ' AND MONTH(a.created_at) = ?';
        } else if (year) {
            dropOffsQuery += ' AND YEAR(a.created_at) = ?';
        }

        const [[{ totalDropOffs }]] = await pool.execute(dropOffsQuery, params);

        return {
            overallDropOffRate: ((totalDropOffs / totalApplicants) * 100).toFixed(2) + '%',
            monthlyDropOffs: monthlyDropOffs.map(row => ({
                month: row.month,
                dropOffRate: ((row.count / totalApplicants) * 100).toFixed(2) + '%'
            })),
            allMonthlyDropOffs: allMonthlyDropOffs.map(row => ({
                month: row.month,
                dropOffRate: ((row.count / totalApplicants) * 100).toFixed(2) + '%'
            }))
        };
    } catch (error) {
        console.error('Error fetching drop-off rate:', error);
        return null;
    }
};







// analytic/metrics
const f_reasonForBlacklisted = async (month, year, position_id) => {
    try {
        let whereClause = 'WHERE reason IS NOT NULL';
        const params = [];
        const subqueryParams = []

        if (month && year) {
            whereClause += ' AND MONTH(updated_at) = ? AND YEAR(updated_at) = ?';
            params.push(parseInt(month), parseInt(year));
            subqueryParams.push(parseInt(month), parseInt(year));
        } else if (month) {
            whereClause += ' AND MONTH(updated_at) = ?';
            params.push(parseInt(month));
            subqueryParams.push(parseInt(month));
        } else if (year) {
            whereClause += ' AND YEAR(updated_at) = ?';
            params.push(parseInt(year));
            subqueryParams.push(parseInt(year));
        }

        const sql = `
            SELECT 
                reason AS blacklisted_reason,
                COUNT(reason) AS count,
                IFNULL(COUNT(reason) * 1.0 / (SELECT COUNT(*) FROM ats_applicant_progress ${whereClause}), 0) * 100 AS percentage
            FROM ats_applicant_progress
            ${whereClause}
            GROUP BY reason
        `;

        const [results] = await pool.execute(sql, [...params, ...subqueryParams]);

        return results.map(row => ({
            reason: row.blacklisted_reason,
            count: row.count,
            percentage: parseFloat(row.percentage).toFixed(2) + '%'
        }));
    } catch (error) {
        console.error('Error fetching blacklist reasons:', error);
        return null;
    }
};
// analytic/metrics
const f_reasonForRejection = async (month, year, position_id) => {
    try {
        let whereClause = 'WHERE reason_for_rejection IS NOT NULL';
        const params = [];
        const subqueryParams = [];

        if (month && year) {
            whereClause += ' AND MONTH(updated_at) = ? AND YEAR(updated_at) = ?';
            params.push(parseInt(month), parseInt(year));
            subqueryParams.push(parseInt(month), parseInt(year));
        } else if (month) {
            whereClause += ' AND MONTH(updated_at) = ?';
            params.push(parseInt(month));
            subqueryParams.push(parseInt(month));
        } else if (year) {
            whereClause += ' AND YEAR(updated_at) = ?';
            params.push(parseInt(year));
            subqueryParams.push(parseInt(year));
        }

        const sql = `
            SELECT 
                reason_for_rejection AS rejection_reason,
                COUNT(reason_for_rejection) AS count,
                IFNULL(
                    COUNT(reason_for_rejection) * 1.0 / (
                        SELECT COUNT(*) 
                        FROM ats_applicant_progress 
                        WHERE reason_for_rejection IS NOT NULL
                        ${month || year ? ' AND ' + whereClause.replace('WHERE ', '') : ''}
                    ), 
                    0
                ) * 100 AS percentage
            FROM ats_applicant_progress
            ${whereClause}
            GROUP BY reason_for_rejection
        `;

        const [results] = await pool.execute(sql, [...params, ...subqueryParams]);

        return results.map(row => ({
            reason: row.rejection_reason,
            count: row.count,
            percentage: parseFloat(row.percentage).toFixed(2) + '%'
        }));
    } catch (error) {
        console.error('Error fetching rejection reasons:', error);
        return null;
    }
};

module.exports = {
    f_applicationsReceived,
    f_topJobs,
    f_InternalExternalHires,
    f_dropOffRate,
    f_reasonForBlacklisted,
    f_reasonForRejection
}