const { config } = require("dotenv");
const gdriveModel = require("../../models/userConfiguration/gdriveModel");
require("dotenv").config();

const COMPANY_ID = process.env.COMPANY_ID;

exports.addGdriveConfigurationCredentials = (req, res) => {
    try {
        let { company_id, config_json, gdrive_folder_id } = req.body;
        gdriveModel.addGdriveConfigurationCredentials(COMPANY_ID, config_json, gdrive_folder_id);
        return res.status(201).json({ message: "successfully inserted" })
    } catch (error) {
        return res.status(501).json({ message: error.message })
    }
}

exports.getGdriveConfig = async (req, res) => {
    try {
        const { company_id } = req.params;
        const config = await gdriveModel.getGdriveConfibyid(company_id);
        if (config) {
            res.status(200).json(config);
        } else {
            res.status(404).json({ message: "GDrive config not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}