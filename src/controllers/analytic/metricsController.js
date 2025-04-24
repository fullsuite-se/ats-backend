const pool = require("../../config/db");
const metricModel = require("../../models/analytic/metricModel");

exports.getMetrics = async (req, res) => {
    try {
        const { month, year } = req.query;

        // Log the filtering parameters for debugging


        // Pass month and year parameters to all metric functions
        const applicationsReceived = await metricModel.f_applicationsReceived(month, year);
        const topJobs = await metricModel.f_topJobs(month, year);
        const internalExternalHires = await metricModel.f_InternalExternalHires(month, year);
        const dropOffRate = await metricModel.f_dropOffRate(month, year);
        const reasonForBlacklisted = await metricModel.f_reasonForBlacklisted(month, year);
        const reasonForRejection = await metricModel.f_reasonForRejection(month, year);

        // Include the applied filters in the response
        res.json({
            filters: {
                month: month || null,
                year: year || null
            },
            applicationsReceived,
            topJobs,
            internalExternalHires,
            dropOffRate,
            reasonForRejection,
            reasonForBlacklisted
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// endpoint for getting the count of applicant from FS website
exports.getFSApplicationCount = async (req, res) => {
    try {
        const sql = `
            SELECT COUNT(*) as fs_count
            FROM ats_applicant_trackings
            WHERE applied_source = 'Suitelife'
        `;

        const [result] = await pool.execute(sql);
        const count = result[0].fs_count;
        res.status(200).json({ message: "okay", fs_count: count });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
}