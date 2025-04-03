/*
TODO 
    1) add applicant to pending table
    2) get pending applicant
    3) confirm adding 
    4) reject pending applicant
*/

const pool = require("../../config/db");
const { v4: uuidv4 } = require('uuid');


exports.addApplicantToPending =async (req, res) => {
    try {
        if (!req.body.applicant) {
            return res.status(400).json({ message: "Applicant data is missing" });
        }
    
        const applicant = JSON.parse(req.body.applicant);
        const applicantStringify = JSON.stringify(applicant); 
        const pending_applicant_id = uuidv4(); 
        const sql = `
            INSERT INTO ats_pending_applicants (pending_applicant_id, applicant)
            VALUES (?, ?); 
        `;
        const values = [pending_applicant_id, applicantStringify]; 
        await pool.execute(sql, values); 
        return res.status(201).json({message: "pending applicant successfully added"})
    } catch (error) {
        return res.status(500).json({ message: error.message });

    }
}

// get only where status = 1 (meaning open)
exports.getPendingApplicant = async (req, res) => {
    try {
        const sql = `
            SELECT * 
            FROM ats_pending_applicants 
            WHERE status = 1;
        `;
        const [results] = await pool.execute(sql); 
        return res.status(201).json({message: "successfully retrieved", pendingApplicants: results})
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

exports.confirmPendingApplicant = (req, res) => {

}

exports.rejectPendingApplicant = (req, res) => {

}