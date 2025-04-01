const pool = require("../../config/db");

const editApplicant = async (applicant) => {
console.log("applicant" + JSON.stringify(applicant));
  try {
    let sql = `
      UPDATE ats_applicants 
      SET 
        first_name = ?, 
        middle_name = ?, 
        last_name = ?, 
        gender = ?, 
        birth_date = ?, 
        discovered_at = ?, 
        cv_link = ? 
      WHERE applicant_id = ?
    `;
    let values = [
      applicant.first_name,
      applicant.middle_name || null,
      applicant.last_name,
      applicant.gender,
      applicant.birth_date,
      applicant.discovered_at,
      applicant.cv_link || null,
      applicant.applicant_id
    ];
    await pool.execute(sql, values);

    sql = `
      UPDATE ats_contact_infos 
      SET 
        mobile_number_1 = ?, 
        mobile_number_2 = ?, 
        email_1 = ?, 
        email_2 = ?, 
        email_3 = ? 
      WHERE applicant_id = ?
    `;
    values = [
      applicant.mobile_number_1 || null,
      applicant.mobile_number_2 || null,
      applicant.email_1 || null,
      applicant.email_2 || null,
      applicant.email_3 || null,
      applicant.applicant_id
    ];
    await pool.execute(sql, values);

    if (applicant.date_applied) {
      sql = `
        UPDATE ats_applicant_trackings 
        SET 
          position_id = ?, 
          created_at = ?, 
          test_result = ? 
        WHERE applicant_id = ?
      `;
      values = [ 
        applicant.position_id,
        applicant.date_applied,
        applicant.test_result || null,
        applicant.applicant_id
      ];
    } else {
      sql = `
        UPDATE ats_applicant_trackings 
        SET 
          position_id = ?, 
          test_result = ? 
        WHERE applicant_id = ?
      `;
      values = [
        applicant.position_id,
        applicant.test_result || null,
        applicant.applicant_id
      ];
    }
    await pool.execute(sql, values);

    return true;
  } catch (error) {
    console.log("Error editing applicant: ", error);
    return false;
  }
};

exports.editApplicant = async (req, res) => {
  const applicant = JSON.parse(req.body.applicant);
  const isSuccess = await editApplicant(applicant);
  if (isSuccess) {
    return res.status(201).json({ message: "successfully updated" });
  }
  res.status(500).json({ message: "failed to update" });
};