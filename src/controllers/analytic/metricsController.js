const pool = require("../../config/db");
const metricModel = require("../../models/analytic/metricModel"); 

exports.getMetrics = async (req, res) => {
    try {
        const applicationsReceived = await metricModel.f_applicationsReceived();
        const topJobs = await metricModel.f_topJobs();
        const internalExternalHires = await metricModel.f_InternalExternalHires();
        const dropOffRate = await metricModel.f_dropOffRate();

        res.json({
            applicationsReceived,
            topJobs,
            internalExternalHires,
            dropOffRate
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