/*
TODO 
    1) add applicant to pending table
    2) get pending applicant
    3) confirm adding 
    4) reject pending applicant
*/

const pool = require("../../config/db");
const { v4: uuidv4 } = require('uuid');
const applicantModel = require("../../models/applicant/applicantModel");
const { errorMonitor } = require("nodemailer/lib/xoauth2");
const positionModel = require("../../models/position/positionModel"); 
const getPendingApplicant = async (pending_applicant_id) => {
    try {
        const sql = `
            SELECT * 
            FROM ats_pending_applicants
            WHERE pending_applicant_id = ?
        `;

        const values = [pending_applicant_id];
        const [results] = await pool.execute(sql, values);
        return results[0];
    } catch (error) {
        console.log(error.message);
        
        return {};
    }
}

const changePendingStatus = async (pending_applicant_id, status) => {
    const sql = `
        UPDATE ats_pending_applicants 
        SET status = ?
        WHERE pending_applicant_id = ?
    `;
    const values = [status, pending_applicant_id];
    await pool.execute(sql, values);
    return
}



exports.addApplicantToPending = async (req, res) => {
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
        return res.status(201).json({ message: "pending applicant successfully added" })
    } catch (error) {
        return res.status(500).json({ message: error.message });

    }
}

// get only where status = 1 (meaning open)
// exports.getPendingApplicants = async (req, res) => {
//     try {
//         const positions = await positionModel.getPositions(); 
//         console.log('positions', positions);
        
//         const sql = `
//             SELECT * 
//             FROM ats_pending_applicants 
//             WHERE status = 1;
//         `;
//         const [results] = await pool.execute(sql);

//         console.log('pending applicants: ', results);
        
//         return res.status(201).json({ message: "successfully retrieved", pendingApplicants: results })
//     } catch (error) {
//         return res.status(500).json({ message: error.message });
//     }
// }

exports.getPendingApplicants = async (req, res) => {
    try {
        const positions = await positionModel.getPositions(); 

        
        const positionMap = {};
        for (const pos of positions) {
            positionMap[pos.job_id] = pos.title;
        }

        const sql = `
            SELECT * 
            FROM ats_pending_applicants 
            WHERE status = 1;
        `;
        const [results] = await pool.execute(sql);

        const updatedResults = results.map(applicantEntry => {
            const applicant = applicantEntry.applicant;
            const jobTitle = positionMap[applicant.position_id] || 'Unknown Position';
            return {
                ...applicantEntry,
                applicant: {
                    ...applicant,
                    title: jobTitle
                }
            };
        });

        return res.status(201).json({ 
            message: "successfully retrieved", 
            pendingApplicants: updatedResults 
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


exports.confirmPendingApplicant = async (req, res) => {
    try {
        const pending_applicant_id = req.body.pending_applicant_id;
        console.log('id', pending_applicant_id);


        const pendingApplicant = await getPendingApplicant(pending_applicant_id);
        //extract only the applicant
        const applicant = pendingApplicant.applicant;

        console.log('applicant', applicant);
        

        //pass it to the insert function 
        await applicantModel.insertApplicant(applicant);

        //change the status to 0 to reflect that it is not pending. 
        await changePendingStatus(pending_applicant_id, 0);

        return res.status(201).json({ message: "successfully inserted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }


}

exports.rejectPendingApplicant = async (req, res) => {
    try {
        const pending_applicant_id = req.body.pending_applicant_id;

        await changePendingStatus(pending_applicant_id, 0);
        res.status(200).json({ message: "successfully rejected (changed the status to 0)" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}