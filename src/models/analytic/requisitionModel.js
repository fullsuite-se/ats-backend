const pool = require("../../config/db");

// exports.getRequisitionData = async (month, year, position_id) => {
//     try {
//         const selectColumn = groupBy === 'year' ? 'YEAR(p.updated_at)' : 'MONTHNAME(p.updated_at)';
//         const groupColumn = groupBy === 'year' ? 'YEAR(p.updated_at)' : 'MONTHNAME(p.updated_at), MONTH(p.updated_at) ';
//         const orderColumn = groupBy === 'year' ? 'YEAR(p.updated_at)' : 'MONTH(p.updated_at)';

//         // Start building the WHERE clause
//         let whereClause = filter.position ? 'WHERE j.title = ?' : 'WHERE 1=1';
//         let queryParams = filter.position ? [filter.position] : [];

//         // Add month/year filters if provided
//         if (filter.month && filter.year) {
//             whereClause += ' AND MONTH(p.updated_at) = ? AND YEAR(p.updated_at) = ?';
//             queryParams.push(parseInt(filter.month), parseInt(filter.year));
//         } else if (filter.month) {
//             whereClause += ' AND MONTH(p.updated_at) = ?';
//             queryParams.push(parseInt(filter.month));
//         } else if (filter.year) {
//             whereClause += ' AND YEAR(p.updated_at) = ?';
//             queryParams.push(parseInt(filter.year));
//         }

//         const sql = `
//             SELECT
//                 ${selectColumn} AS label,
//                 COUNT(CASE WHEN p.status IN ('JOB_OFFER_ACCEPTED', 'JOB_OFFER_REJECTED', 'WITHDREW_APPLICATION', 'BLACKLISTED', 'NOT_FIT') THEN 1 END) AS closed, 
//                 COUNT(CASE WHEN p.status = 'JOB_OFFER_ACCEPTED' THEN 1 END) AS passed,
//                 COUNT(CASE WHEN p.status NOT IN ('JOB_OFFER_ACCEPTED', 'JOB_OFFER_REJECTED', 'WITHDREW_APPLICATION', 'BLACKLISTED', 'NOT_FIT') THEN 1 END) AS onProgress
//             FROM ats_applicant_progress p
//             INNER JOIN ats_applicant_trackings t ON t.progress_id = p.progress_id
//             INNER JOIN sl_company_jobs j ON j.job_id = t.position_id
//             ${whereClause}
//             GROUP BY ${groupColumn}
//             ORDER BY ${orderColumn};
//         `;


//         const [results] = await pool.execute(sql, queryParams);
//         return results;
//     } catch (error) {
//         console.error(error.message);
//         return [];
//     }
// };
exports.getRequisitionData = async (month, year, position_id) => {
    console.log("Fetching requisition data with filters:", { month, year, position_id });
    try {
        // Determine groupBy logic
        let groupBy = 'year'; // default
        if (month && year && position_id) {
            groupBy = 'year_month_position';
        } else if (month && year) {
            groupBy = 'year_month';
        } else if (position_id && year) {
            groupBy = 'year_position';
        } else if (position_id) {
            groupBy = 'position';
        } else if (month) {
            groupBy = 'month';
        }

        // Set SELECT, GROUP BY, and ORDER BY columns based on grouping logic
        let selectColumn, groupColumn, orderColumn;
        switch (groupBy) {
            case 'year_month_position':
                selectColumn = 'YEAR(p.updated_at) AS year, MONTH(p.updated_at) AS month, t.position_id';
                groupColumn = 'YEAR(p.updated_at), MONTH(p.updated_at), t.position_id';
                orderColumn = 'YEAR(p.updated_at), MONTH(p.updated_at), t.position_id';
                break;
            case 'year_month':
                selectColumn = 'YEAR(p.updated_at) AS year, MONTH(p.updated_at) AS month';
                groupColumn = 'YEAR(p.updated_at), MONTH(p.updated_at)';
                orderColumn = 'YEAR(p.updated_at), MONTH(p.updated_at)';
                break;
            case 'year_position':
                selectColumn = 'YEAR(p.updated_at) AS year, t.position_id';
                groupColumn = 'YEAR(p.updated_at), t.position_id';
                orderColumn = 'YEAR(p.updated_at), t.position_id';
                break;
            case 'position':
                selectColumn = 't.position_id';
                groupColumn = 't.position_id';
                orderColumn = 't.position_id';
                break;
            case 'month':
                selectColumn = 'MONTH(p.updated_at) AS month';
                groupColumn = 'MONTH(p.updated_at)';
                orderColumn = 'MONTH(p.updated_at)';
                break;
            default:
                selectColumn = 'YEAR(p.updated_at) AS year';
                groupColumn = 'YEAR(p.updated_at)';
                orderColumn = 'YEAR(p.updated_at)';
        }

        // Build the WHERE clause dynamically
        let whereClause = 'WHERE 1=1';
        let queryParams = [];

        if (month) {
            whereClause += ' AND MONTH(p.updated_at) = ?';
            queryParams.push(parseInt(month));
        }

        if (year) {
            whereClause += ' AND YEAR(p.updated_at) = ?';
            queryParams.push(parseInt(year));
        }

        if (position_id) {
            whereClause += ' AND t.position_id = ?';
            queryParams.push(position_id);
        }

        // Log the position_id and query parameters
        console.log("Position ID:", position_id);
        console.log("Query Parameters:", queryParams);

        // Final SQL query
        const sql = `
            SELECT
                ${selectColumn},
                COUNT(CASE WHEN p.status IN ('JOB_OFFER_ACCEPTED', 'JOB_OFFER_REJECTED', 'WITHDREW_APPLICATION', 'BLACKLISTED', 'NOT_FIT') THEN 1 END) AS closed, 
                COUNT(CASE WHEN p.status = 'JOB_OFFER_ACCEPTED' THEN 1 END) AS passed,
                COUNT(CASE WHEN p.status NOT IN ('JOB_OFFER_ACCEPTED', 'JOB_OFFER_REJECTED', 'WITHDREW_APPLICATION', 'BLACKLISTED', 'NOT_FIT') THEN 1 END) AS onProgress
            FROM ats_applicant_progress p
            INNER JOIN ats_applicant_trackings t ON t.progress_id = p.progress_id
            INNER JOIN sl_company_jobs j ON j.job_id = t.position_id
            ${whereClause}
            GROUP BY ${groupColumn}
            ORDER BY ${orderColumn};
        `;

        // Log the final query
        console.log("SQL Query:", sql);

        const [results] = await pool.execute(sql, queryParams);
        return results;
    } catch (error) {
        console.error("Error fetching requisition data:", error.message);
        return [];
    }
};