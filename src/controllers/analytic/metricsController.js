const pool = require("../../config/db");
const metricModel = require("../../models/analytic/metricModel");

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

exports.applicantReceived = async (req, res) => {
    try {
        const { month, year, position_id } = req.query;
        const applicationsReceived = await metricModel.f_applicationsReceived(month, year, position_id);

        return res.status(200).json({ message: "successfully retrieved", application_received: applicationsReceived })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

exports.topJobApplied = async (req, res) => {
    try {
        const { month, year, position_id } = req.query;
        const { title, count, total_applicant, percentage } = await metricModel.f_topJobs(month, year, position_id);

        return res.status(200).json({ message: "successfully retrieved", title, count, total_applicant, percentage })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

exports.internalExternalHires = async (req, res) => {
    try {
        const { month, year, position_id } = req.query;
        const { internal, external, internalRate, externalRate } = await metricModel.f_InternalExternalHires(month, year, position_id);

        return res.status(200).json({ message: "successfully retrieved", internal, external, externalRate, internalRate })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

exports.candidateDropOffRate = async (req, res) => {
    try {
        const { month, year, position_id } = req.query;
        const dropoffRate = await metricModel.f_dropOffRate(month, year, position_id);

        return res.status(200).json({ message: "successfully retrieved", drop_off_rate: dropoffRate })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

exports.reasonForBlacklisted = async (req, res) => {
    try {
        const { month, year, position_id } = req.query;
        const reasonForBlacklisted = await metricModel.f_reasonForBlacklisted(month, year, position_id);

        return res.status(200).json({ message: "successfully retrieved", reason_for_blacklisted: reasonForBlacklisted })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

exports.reasonForRejection = async (req, res) => {
    try {
        const { month, year, position_id } = req.query;
        const reasonForRejection = await metricModel.f_reasonForRejection(month, year, position_id);

        return res.status(200).json({ message: "successfully retrieved", reason_for_rejection: reasonForRejection })
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
