const pool = require("../../config/db");
const { v4: uuidv4 } = require("uuid");
const applicantModel = require("../../models/applicant/applicantModel");
const app = require("../../app");
// /interview - post
exports.addInterview = async (req, res) => {
    try {
        const interview = req.body;
        const interview_id = uuidv4();

        let sql = `INSERT INTO ats_applicant_interviews (interview_id, tracking_id, interviewer_id, date_of_interview)
                     VALUES (?, ?, ?, ?)`;
        let values = [interview_id, interview.tracking_id, interview.interviewer_id, interview.date_of_interview];
        await pool.execute(sql, values);

        res.status(201).json({ message: "interview added" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error });
    }
}

exports.getInterview = async (req, res) => {
    try {
        const tracking_id = req.query.tracking_id;
        console.log(tracking_id);

        if (!tracking_id) {
            return res.status(400).json({ message: "Missing tracking_id parameter" });
        }

        const sql = `
            SELECT 
                ai.interview_id,
                ai.tracking_id,
                ai.date_of_interview,
                ai.created_at AS interview_created_at,

                u.user_id AS interviewer_id,
                u.first_name AS interviewer_first_name,
                u.middle_name AS interviewer_middle_name,
                u.last_name AS interviewer_last_name,
                u.personal_email AS interviewer_email,
                u.contact_number AS interviewer_contact,

                ua.user_email AS interviewer_account_email,
                ua.is_deactivated AS interviewer_status,

                COALESCE(
                    JSON_ARRAYAGG(
                        CASE 
                            WHEN n.note_id IS NOT NULL THEN JSON_OBJECT(
                                'note_id', n.note_id,
                                'note_type', n.note_type,
                                'note_body', n.note_body,
                                'noted_at', n.noted_at,
                                'noted_by', nu.first_name
                            )
                            ELSE NULL
                        END
                    ), '[]'
                ) AS interview_notes

            FROM ats_applicant_interviews ai
            LEFT JOIN ats_interviews_notes n ON ai.interview_id = n.interview_id
            LEFT JOIN hris_user_infos u ON ai.interviewer_id = u.user_id
            LEFT JOIN hris_user_accounts ua ON u.user_id = ua.user_id
            LEFT JOIN hris_user_infos nu ON n.user_id = nu.user_id
            WHERE ai.tracking_id = ?
            GROUP BY ai.interview_id, ai.tracking_id, ai.date_of_interview, ai.created_at,
                     u.user_id, u.first_name, u.middle_name, u.last_name, u.personal_email, u.contact_number,
                     ua.user_email, ua.is_deactivated
            ORDER BY ai.created_at ASC;
        `;

        const values = [tracking_id];
        const [results] = await pool.execute(sql, values);

        // Ensure interview_notes is parsed as a JavaScript array
        const formattedResults = results.map(interview => ({
            ...interview,
            interview_notes: Array.isArray(interview.interview_notes)
                ? interview.interview_notes.filter(note => note !== null)  // Remove null values
                : JSON.parse(interview.interview_notes)
                    .filter(note => note !== null)  // Remove null values
                    .sort((a, b) => new Date(a.noted_at) - new Date(b.noted_at)) // Sort by noted_at
        }));
        res.status(200).json(formattedResults);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};


exports.editNote = async (req, res) => {
    try {
        const interview = req.body;

        const sql = `
            UPDATE ats_interviews_notes
            SET note_body = ?
            WHERE note_id = ?
        `;
        const values = [interview.note_body, interview.note_id];
        await pool.execute(sql, values);

        res.status(201).json({ message: "note edited" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error });
    }
}

exports.addNote = async (req, res) => {
    try {
        //we need the interview_id, note_type, and note_body
        const interview = req.body;
        const note_id = uuidv4();

        const sql = `
            INSERT INTO ats_interviews_notes (note_id, interview_id, note_type, note_body, user_id)
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [note_id, interview.interview_id, interview.note_type, interview.note_body, interview.noted_by];

        await pool.execute(sql, values);
        res.status(201).json({ message: "interview note added" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error });
    }
}

exports.exportDiscussionInterview = async (req, res) => {
    try {
        const applicant_id = req.params
        const tracking_id = req.query.tracking_id;
        console.log(tracking_id);

        if (!tracking_id) {
            return res.status(400).json({ message: "Missing tracking_id parameter" });
        }

        const sql = `
            SELECT
                ai.interview_id,
                ai.tracking_id,
                ai.date_of_interview,
                ai.created_at AS interview_created_at,

                u.user_id AS interviewer_id,
                u.first_name AS interviewer_first_name,
                u.middle_name AS interviewer_middle_name,
                u.last_name AS interviewer_last_name,
                u.personal_email AS interviewer_email,
                u.contact_number AS interviewer_contact,

                ua.user_email AS interviewer_account_email,
                ua.is_deactivated AS interviewer_status,

                COALESCE(
                    JSON_ARRAYAGG(
                        CASE 
                            WHEN n.note_id IS NOT NULL THEN JSON_OBJECT(
                                'note_id', n.note_id,
                                'note_type', n.note_type,
                                'note_body', n.note_body,
                                'noted_at', n.noted_at,
                                'noted_by', nu.first_name
                            )
                            ELSE NULL
                        END
                    ), '[]'
                ) AS interview_notes
            
            FROM ats_applicant_interviews ai
            LEFT JOIN ats_interviews_notes n ON ai.interview_id = n.interview_id
            LEFT JOIN hris_user_infos u ON ai.interviewer_id = u.user_id
            LEFT JOIN hris_user_accounts ua ON u.user_id = ua.user_id
            LEFT JOIN hris_user_infos nu ON n.user_id = nu.user_id
            WHERE ai.tracking_id = ?
            GROUP BY ai.interview_id, ai.tracking_id, ai.date_of_interview, ai.created_at,
                     u.user_id, u.first_name, u.middle_name, u.last_name, u.personal_email, u.contact_number,
                     ua.user_email, ua.is_deactivated
            ORDER BY ai.created_at ASC;
        `;

        const values = [tracking_id];
        const [results] = await pool.execute(sql, values);

        // Ensure interview_notes is parsed as a JavaScript array
        const formattedResults = results.map(interview => ({
            ...interview,
            interview_notes: Array.isArray(interview.interview_notes)
                ? interview.interview_notes.filter(note => note !== null)  // Remove null values
                : JSON.parse(interview.interview_notes)
                    .filter(note => note !== null)  // Remove null values
                    .sort((a, b) => new Date(a.noted_at) - new Date(b.noted_at)) // Sort by noted_at
        }));

        const applicant = await applicantModel.getApplicant(applicant_id);

        res.status(200).json(formattedResults, applicant);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
}



