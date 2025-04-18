const Setup = require("../../models/jobs/setupModel.js");
const { v7: uuidv7 } = require("uuid");
const { now } = require("../../utils/date.js");

exports.getAllSetups = async (req, res) => {
  try {
    const setups = await Setup.getAllSetups();
    res.status(200).json({ success: true, data: setups });
  } catch (err) {
    console.error("Error fetching setups:", err.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.insertSetup = async (req, res) => {
  try {
    const { setupName, userId } = req.body;

    if (!setupName) {
      return res.status(400).json({ success: false, message: "Missing required field: setup name" });
    }

    const newSetup = {
      setup_id: uuidv7(),
      setup_name: setupName,
      created_at: now(),
      created_by: userId,
    };

    await Setup.insertSetup(newSetup);
    res.status(201).json({ success: true, message: "Setup added successfully" });
  } catch (err) {
    console.error("Error inserting setup:", err.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.updateSetup = async (req, res) => {
  try {
    const { userId, setup_name } = req.body;
    const { setupId } = req.params;

    if (!userId || !setup_name) {
      return res.status(400).json({ success: false, message: "Missing required fields: setup id or setup name" });
    }

    const result = await Setup.updateSetup(userId, setup_name, setupId);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Setup not found or not updated" });
    }

    res.status(200).json({ success: true, message: "Setup updated successfully" });
  } catch (err) {
    console.error("Error updating setup:", err.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.deleteSetup = async (req, res) => {
  try {
    const { setup_id } = req.body;

    if (!setup_id) {
      return res.status(400).json({ success: false, message: "Missing: setup id" });
    }

    const result = await Setup.deleteSetup(setup_id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Setup not found or already deleted" });
    }

    res.status(200).json({ success: true, message: "Setup deleted successfully" });
  } catch (err) {
    console.error("Error deleting setup:", err.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};