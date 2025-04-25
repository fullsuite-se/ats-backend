const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../../config/db");
const { v4: uuidv4 } = require("uuid");
const userModel = require("../../models/user/userModel");
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

exports.getAllUserAccounts = async (req, res) => {

    const sql = `
        SELECT 
            u.user_id, 
            u.user_email, 
            u.user_key, 
            u.is_deactivated, 
            u.created_at,
            d.company_id, 
            d.job_title_id, 
            d.department_id, 
            d.division_id, 
            d.upline_id,
            i.user_info_id, 
            i.first_name, 
            i.middle_name, 
            i.last_name, 
            i.extension_name,
            i.sex, 
            i.user_pic, 
            i.personal_email, 
            i.contact_number, 
            i.birthdate,
            (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'service_feature_id', sf.service_feature_id,
                        'feature_name', sf.feature_name,
                        'description', sf.description,
                        'category', sf.category
                    )
                ) AS service_features
                FROM hris_user_access_permissions uap
                JOIN service_features sf ON uap.service_feature_id = sf.service_feature_id
                WHERE uap.user_id = u.user_id
            ) AS service_features
        FROM hris_user_accounts u
        LEFT JOIN hris_user_designations d ON u.user_id = d.user_id
        LEFT JOIN hris_user_infos i ON u.user_id = i.user_id
    `;

    try {
        const results = await userModel.getAllUserAccounts();

        const parsedResults = results.map(user => {
            let serviceFeatures = [];
            try {
                if (typeof user.service_features === "string") {
                    serviceFeatures = JSON.parse(user.service_features);
                } else if (typeof user.service_features === "object") {
                    serviceFeatures = user.service_features;
                }
            } catch (err) {
                console.error(`Error parsing service_features for user_id ${user.user_id}:`, err);
            }

            return {
                ...user,
                service_features: serviceFeatures || []
            };
        });

        return res.status(200).json({
            message: "User accounts retrieved",
            userAccounts: parsedResults
        });
    } catch (error) {
        console.error("Error fetching user accounts:", error);
        return res.status(500).json({ message: "Error fetching user accounts", error });
    }
};

exports.updateUserAccount = async (req, res) => {
    try {
        console.log("REQUEST PARAMS:", req.params);
        console.log("REQUEST BODY:", req.body);

        const user_id = req.params.id; // Assuming the user ID is passed as a URL parameter
        const data = req.body;

        console.log("USER ID:", user_id);
        console.log("JOB TITLE ID:", data.job_title_id); // Log job_title_id

        const hashedPassword = data.user_password
            ? await bcrypt.hash(data.user_password, 10)
            : null;

        console.log("HASHED PASSWORD:", hashedPassword);

        // Dynamically construct the SET clause
        const setClause = `user_email = ?${hashedPassword ? ", user_password = ?" : ""}`;
        const updateUserAccountSQL = `
            UPDATE hris_user_accounts 
            SET ${setClause}
            WHERE user_id = ?
        `;
        const userAccountValues = hashedPassword
            ? [data.user_email, hashedPassword, user_id]
            : [data.user_email, user_id];

        console.log("UPDATE USER ACCOUNT SQL:", updateUserAccountSQL);
        console.log("USER ACCOUNT VALUES:", userAccountValues);

        await pool.execute(updateUserAccountSQL, userAccountValues);

        console.log("User account updated successfully.");

        // Update user designations
        const updateUserDesignationsSQL = `
            UPDATE hris_user_designations 
            SET company_id = ?, job_title_id = ? 
            WHERE user_id = ?
        `;
        const userDesignationsValues = [data.company_id, data.job_title_id, user_id];

        console.log("UPDATE USER DESIGNATIONS SQL:", updateUserDesignationsSQL);
        console.log("USER DESIGNATIONS VALUES:", userDesignationsValues);

        await pool.execute(updateUserDesignationsSQL, userDesignationsValues);

        console.log("User designations updated successfully.");

        // Update user access permissions
        console.log("Deleting existing user access permissions...");
        await pool.execute(
            `DELETE FROM hris_user_access_permissions WHERE user_id = ?`,
            [user_id]
        );

        console.log("Existing user access permissions deleted.");

        let service_feature_ids;
        try {
            service_feature_ids = JSON.parse(data.service_feature_ids);
            console.log("PARSED SERVICE FEATURE IDS:", service_feature_ids);

            if (!Array.isArray(service_feature_ids)) {
                console.error("service_feature_ids is not an array.");
                return res.status(400).json({ message: "service_feature_ids must be an array." });
            }
        } catch (err) {
            console.error("Error parsing service_feature_ids:", err);
            return res.status(400).json({ message: "Invalid JSON format in service_feature_ids." });
        }

        console.log("Inserting new user access permissions...");
        await Promise.all(service_feature_ids.map(service_feature_id => {
            console.log("Inserting service_feature_id:", service_feature_id);
            return pool.execute(
                `INSERT INTO hris_user_access_permissions (user_access_permission_id, user_id, service_feature_id) VALUES (?, ?, ?)`,
                [uuidv4(), user_id, service_feature_id]
            );
        }));

        console.log("User access permissions updated successfully.");

        // Update user infos
        const updateUserInfosSQL = `
            UPDATE hris_user_infos 
            SET first_name = ?, middle_name = ?, last_name = ?, extension_name = ?, 
                sex = ?, user_pic = ?, personal_email = ?, contact_number = ?, birthdate = ?
            WHERE user_id = ?
        `;
        const userInfosValues = [
            data.first_name,
            data.middle_name || null,
            data.last_name,
            data.extension_name || null,
            data.sex || null,
            data.user_pic || null,
            data.personal_email,
            data.contact_number || null,
            data.birthdate || null,
            user_id
        ];

        console.log("UPDATE USER INFOS SQL:", updateUserInfosSQL);
        console.log("USER INFOS VALUES:", userInfosValues);

        await pool.execute(updateUserInfosSQL, userInfosValues);

        console.log("User infos updated successfully.");

        return res.status(200).json({ message: "User updated successfully" });
    } catch (error) {
        console.error("Error updating user:", error);
        return res.status(500).json({ message: error.message });
    }
};
exports.createUserAccount = async (req, res) => {
    try {
        const data = req.body;
        const user_id = uuidv4();
        const user_info_id = uuidv4();
        const user_access_permision_id = uuidv4();
        const user_designation_id = uuidv4();

        console.log("REQUEST BODY:", data);
        console.log("GENERATED USER ID:", user_id);
        console.log("GENERATED USER INFO ID:", user_info_id);
        console.log("GENERATED USER ACCESS PERMISSION ID:", user_access_permision_id);
        console.log("GENERATED USER DESIGNATION ID:", user_designation_id);

        const hashedPassword = await bcrypt.hash(data.user_password, 10);
        console.log("HASHED PASSWORD:", hashedPassword);

        // Insert into user accounts
        const insertUserAccountSQL = `
            INSERT INTO hris_user_accounts (user_id, user_email, user_password) VALUES (?, ?, ?)
        `;
        const userAccountValues = [user_id, data.user_email, hashedPassword];
        console.log("INSERT USER ACCOUNT SQL:", insertUserAccountSQL);
        console.log("USER ACCOUNT VALUES:", userAccountValues);

        await pool.execute(insertUserAccountSQL, userAccountValues);
        console.log("User account inserted successfully.");

        // Insert into user designations
        const insertUserDesignationSQL = `
            INSERT INTO hris_user_designations (user_designation_id, user_id, company_id, job_title_id) VALUES (?, ?, ?, ?)
        `;
        const userDesignationValues = [user_designation_id, user_id, data.company_id, data.job_title_id];
        console.log("INSERT USER DESIGNATION SQL:", insertUserDesignationSQL);
        console.log("USER DESIGNATION VALUES:", userDesignationValues);

        await pool.execute(insertUserDesignationSQL, userDesignationValues);
        console.log("User designation inserted successfully.");

        // Insert into user access permissions
        let service_feature_ids;
        try {
            service_feature_ids = JSON.parse(data.service_feature_ids);
            console.log("PARSED SERVICE FEATURE IDS:", service_feature_ids);

            if (!Array.isArray(service_feature_ids)) {
                console.error("service_feature_ids is not an array.");
                return res.status(400).json({ message: "service_feature_ids must be an array." });
            }
        } catch (err) {
            console.error("Error parsing service_feature_ids:", err);
            return res.status(400).json({ message: "Invalid JSON format in service_feature_ids." });
        }

        console.log("Inserting user access permissions...");
        await Promise.all(service_feature_ids.map(service_feature_id => {
            console.log("Inserting service_feature_id:", service_feature_id);
            const insertUserAccessPermissionSQL = `
                INSERT INTO hris_user_access_permissions (user_access_permission_id, user_id, service_feature_id) VALUES (?, ?, ?)
            `;
            const userAccessPermissionValues = [uuidv4(), user_id, service_feature_id];
            console.log("INSERT USER ACCESS PERMISSION SQL:", insertUserAccessPermissionSQL);
            console.log("USER ACCESS PERMISSION VALUES:", userAccessPermissionValues);

            return pool.execute(insertUserAccessPermissionSQL, userAccessPermissionValues);
        }));
        console.log("User access permissions inserted successfully.");

        // Insert into user infos
        const insertUserInfoSQL = `
            INSERT INTO hris_user_infos (user_info_id, user_id, first_name, middle_name, last_name, extension_name, sex, user_pic, personal_email, contact_number, birthdate) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const userInfoValues = [
            user_info_id,
            user_id,
            data.first_name,
            data.middle_name || null,
            data.last_name,
            data.extension_name || null,
            data.sex || null,
            data.user_pic || null,
            data.personal_email,
            data.contact_number || null,
            data.birthdate || null
        ];
        console.log("INSERT USER INFO SQL:", insertUserInfoSQL);
        console.log("USER INFO VALUES:", userInfoValues);

        await pool.execute(insertUserInfoSQL, userInfoValues);
        console.log("User info inserted successfully.");

        return res.status(201).json({ message: "User inserted successfully" });
    } catch (error) {
        console.error("Error creating user account:", error);
        return res.status(500).json({ message: error.message });
    }
};

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