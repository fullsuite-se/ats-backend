const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../../config/db");
const { v4: uuidv4 } = require("uuid");

const getUserInfoSQL = `
    SELECT
        hris_user_accounts.user_id, 
        hris_user_accounts.user_email, 
        hris_user_infos.first_name, 
        hris_user_infos.middle_name, 
        hris_user_infos.last_name, 
        hris_user_infos.user_pic, 
        hris_user_designations.company_id,
        JSON_OBJECTAGG(service_features.service_feature_id, service_features.feature_name) AS feature_names
    FROM hris_user_accounts
    LEFT JOIN hris_user_infos ON hris_user_accounts.user_id = hris_user_infos.user_id
    LEFT JOIN hris_user_designations ON hris_user_infos.user_id = hris_user_designations.user_id
    LEFT JOIN hris_user_access_permissions ON hris_user_accounts.user_id = hris_user_access_permissions.user_id
    LEFT JOIN service_features ON hris_user_access_permissions.service_feature_id = service_features.service_feature_id
    WHERE hris_user_accounts.user_id = ?
    GROUP BY 
        hris_user_accounts.user_id, 
        hris_user_infos.first_name, 
        hris_user_infos.middle_name, 
        hris_user_infos.last_name, 
        hris_user_infos.user_pic,
        hris_user_designations.company_id
`;

exports.getUserInfo = async (req, res) => {
    console.log(req.user);

    const user_id = req.user.user_id;

    try {
        const values = [user_id];

        const [results] = await pool.execute(getUserInfoSQL, values);
        if (results.length == 0) return res.status(404).json({ message: "User not found" });

        res.status(200).json(results[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// New function to get all user accounts
exports.getAllUserAccounts = async (req, res) => {
    const sql = `
        SELECT 
            hris_user_accounts.user_id, 
            hris_user_infos.first_name, 
            hris_user_infos.middle_name, 
            hris_user_infos.last_name
        FROM hris_user_accounts
        LEFT JOIN hris_user_infos ON hris_user_accounts.user_id = hris_user_infos.user_id
    `;

    try {
        const [results, fields] = await pool.execute(sql);
        return res.status(200).json({ message: "User accounts retrieved", userAccounts: results });
    } catch (error) {
        console.error("Error fetching user accounts:", error);
        return res.status(500).json({ message: "Error fetching user accounts", error });
    }
};

exports.createUserAccount = async (req, res) => {
    try {
        const data = req.body;
        const user_id = uuidv4();
        const user_info_id = uuidv4();
        const user_access_permision_id = uuidv4();
        const user_designation_id = uuidv4();

        const hashedPassword = await bcrypt.hash(data.user_password, 10);

        console.log(req.body);

        //TODO: user accounts
        await pool.execute(
            `
            INSERT INTO hris_user_accounts (user_id, user_email, user_password) VALUES (?, ?, ?)
            `, [user_id, data.user_email, hashedPassword]
        );

        //TODO: user_designations
        await pool.execute(
            `
            INSERT INTO hris_user_designations (user_designation_id, user_id, company_id, job_title_id) VALUES  (?, ?, ?, ?)
            `, [user_designation_id, user_id, data.company_id, data.job_title_id]
        );


        //TODO: hris_user_access_permision
        let service_feature_ids;
        try {
            service_feature_ids = JSON.parse(data.service_feature_ids);
            if (!Array.isArray(service_feature_ids)) {
                return res.status(400).json({ message: "service_feature_ids must be an array." });
            }
        } catch (err) {
            return res.status(400).json({ message: "Invalid JSON format in service_feature_ids." });
        }

        await Promise.all(service_feature_ids.map(service_feature_id => {
            return pool.execute(
                `INSERT INTO hris_user_access_permissions (user_access_permission_id, user_id, service_feature_id) VALUES (?, ?, ?)`,
                [uuidv4(), user_id, service_feature_id]
            );
        }));

        //TODO: user infos
        await pool.execute(
            `
            INSERT INTO hris_user_infos (user_info_id, user_id, first_name, middle_name, last_name, extension_name, sex, user_pic, personal_email, contact_number, birthdate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
            user_info_id,
            user_id, data.first_name,
            data.middle_name || null,
            data.last_name,
            data.extension_name || null,
            data.sex || null,
            data.user_pic || null,
            data.personal_email,
            data.contact_number || null,
            data.birthdate || null]
        );


        return res.status(201).json({ message: "user inserted" });


    } catch (error) {
        return res.status(500).json({ message: error.message });
    }

}

exports.service_features = async (req, res) => {
    const [results] = await pool.execute(
        `SELECT *  FROM service_features`
    );

    return res.status(200).json({ message: "successfully retrieved", service_features: results })
}

exports.job_titles = async (req, res) => {
    const [results] = await pool.execute(`SELECT * FROM company_job_titles`);

    return res.status(200).json({ message: "successfully retrieved", job_titles: results })
}