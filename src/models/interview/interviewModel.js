const pool = require("../../config/db.js");

module.exports.discussionAllInterview = async (tracking_id) => {
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
    return results;
}