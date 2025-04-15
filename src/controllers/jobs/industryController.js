const Industry = require("../../models/jobs/industryModel");

exports.getAllIndustries = async (req, res) => {
  try {
    const industries = await Industry.getAllIndustries();
    res.status(200).json({ success: true, data: industries });
  } catch (err) {
    console.error("Error fetching all industries:", err.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getAllIndustriesHR = async (req, res) => {
  try {
    const industries = await Industry.getAllIndustriesHR();
    res.status(200).json({ success: true, data: industries });
  } catch (err) {
    console.error("Error fetching all industries for HR:", err.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getAllIndustriesPR = async (req, res) => {
  try {
    const industries = await Industry.getAllIndustriesPR();
    res.status(200).json({ success: true, data: industries });
  } catch (err) {
    console.error("Error fetching all industries for PR:", err.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.patchIndustryImagePR = async (req, res) => {
  try {
    const { industryId, imageUrl } = req.body;
    if (!industryId || !imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: industry id or image url",
      });
    }

    await Industry.patchIndustryImage(imageUrl, industryId);

    res
      .status(200)
      .json({ success: true, message: "Industry Image Updated Successfully" });
  } catch (err) {
    console.error("Error updating industry image:", err.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.insertIndustry = async (req, res) => {
  try {
    const { industryName, assessmentUrl, userId } = req.body;
    if (!industryName || !assessmentUrl) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: industry name or assessment url",
      });
    }

    await Industry.insertIndustry(industryName, assessmentUrl, userId);
    res
      .status(201)
      .json({ success: true, message: "Job Industry added successfully." });
  } catch (err) {
    console.error("Error inserting industry:", err.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.updateIndustry = async (req, res) => {
  try {
    const { jobIndId, industryName, assessmentUrl } = req.body;
    if (!jobIndId || !industryName || !assessmentUrl) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: industry id, industry name, or assessment url",
      });
    }

    const updated = await Industry.updateIndustry(
      jobIndId,
      industryName,
      assessmentUrl
    );
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Industry not found or not updated" });
    }

    res
      .status(200)
      .json({ success: true, message: "Industry updated successfully" });
  } catch (err) {
    console.error("Error updating industry:", err.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.deleteIndustry = async (req, res) => {
  try {
    const { industry_id } = req.body;
    if (!industry_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: industry id",
      });
    }

    const deleted = await Industry.deleteIndustry(industry_id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Industry not found or already deleted",
      });
    }

    res
      .status(200)
      .json({ success: true, message: "Industry deleted successfully" });
  } catch (err) {
    console.error("Error deleting industry:", err.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
