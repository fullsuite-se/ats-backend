const CompanyOffice = require("../../models/jobs/officesModel")
const { v4: uuidv4 } = require("uuid");

const companyOfficeController = {
  // Get all offices
  getAllOffices: async (req, res) => {
    try {
      const offices = await CompanyOffice.getAllOffices();
      
      res.json({
        success: true,
        message: "Offices retrieved successfully",
        data: offices,
      });
    } catch (error) {
      console.error("Error getting offices:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  // Get office by ID
  getOfficeById: async (req, res) => {
    try {
      const { officeId } = req.params;
      
      const office = await CompanyOffice.getOfficeById(officeId);
      
      if (!office) {
        return res.status(404).json({
          success: false,
          message: "Office not found",
        });
      }
      
      res.json({
        success: true,
        message: "Office retrieved successfully",
        data: office,
      });
    } catch (error) {
      console.error("Error getting office:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  // Get offices by company ID
  getOfficesByCompanyId: async (req, res) => {
    try {
      const companyId = process.env.COMPANY_ID;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID not configured",
        });
      }
      
      const offices = await CompanyOffice.getOfficesByCompanyId(companyId);
      
      res.json({
        success: true,
        message: "Company offices retrieved successfully",
        data: offices,
      });
    } catch (error) {
      console.error("Error getting company offices:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  // Create new office
  createOffice: async (req, res) => {
    try {
      const { officeName, officeAddress } = req.body;
      const companyId = process.env.COMPANY_ID;
      
      // Validation
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID not configured",
        });
      }
      
      if (!officeName || !officeAddress) {
        return res.status(400).json({
          success: false,
          message: "Office name and office address are required",
        });
      }
      
      const newOffice = {
        office_id: uuidv4(),
        company_id: companyId,
        office_name: officeName,
        office_address: officeAddress,
        created_at: new Date(),
        updated_at: new Date(),
      };
      
      const result = await CompanyOffice.createOffice(newOffice);
      
      res.status(201).json({
        success: true,
        message: "Office created successfully",
        data: {
          officeId: newOffice.office_id,
          ...newOffice
        },
      });
    } catch (error) {
      console.error("Error creating office:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  // Update office
  updateOffice: async (req, res) => {
    try {
      const { officeId } = req.params;
      const { officeName, officeAddress } = req.body;
      
      // Check if office exists and belongs to the company
      const existingOffice = await CompanyOffice.getOfficeById(officeId);
      if (!existingOffice) {
        return res.status(404).json({
          success: false,
          message: "Office not found",
        });
      }

      // Verify office belongs to the current company
      const companyId = process.env.COMPANY_ID;
      if (existingOffice.companyId !== companyId) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this office",
        });
      }
      
      const officeUpdates = {
        office_name: officeName,
        office_address: officeAddress,
        updated_at: new Date(),
      };
      
      // Remove undefined fields
      Object.keys(officeUpdates).forEach(key => {
        if (officeUpdates[key] === undefined) {
          delete officeUpdates[key];
        }
      });
      
      const result = await CompanyOffice.updateOffice(officeId, officeUpdates);
      
      res.json({
        success: true,
        message: "Office updated successfully",
        data: {
          officeId,
          ...officeUpdates
        },
      });
    } catch (error) {
      console.error("Error updating office:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  // Delete office
  deleteOffice: async (req, res) => {
    try {
      const { officeId } = req.params;
      
      // Check if office exists and belongs to the company
      const existingOffice = await CompanyOffice.getOfficeById(officeId);
      if (!existingOffice) {
        return res.status(404).json({
          success: false,
          message: "Office not found",
        });
      }

      // Verify office belongs to the current company
      const companyId = process.env.COMPANY_ID;
      if (existingOffice.companyId !== companyId) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this office",
        });
      }
      
      const result = await CompanyOffice.deleteOffice(officeId);
      
      res.json({
        success: true,
        message: "Office deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting office:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  // Delete all offices by company ID
  deleteOfficesByCompanyId: async (req, res) => {
    try {
      const companyId = process.env.COMPANY_ID;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID not configured",
        });
      }
      
      const result = await CompanyOffice.deleteOfficesByCompanyId(companyId);
      
      res.json({
        success: true,
        message: "All company offices deleted successfully",
        deletedCount: result.affectedRows,
      });
    } catch (error) {
      console.error("Error deleting company offices:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  // Get office count by company ID
  getOfficeCountByCompanyId: async (req, res) => {
    try {
      const companyId = process.env.COMPANY_ID;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID not configured",
        });
      }
      
      const count = await CompanyOffice.getOfficeCountByCompanyId(companyId);
      
      res.json({
        success: true,
        message: "Office count retrieved successfully",
        data: count,
      });
    } catch (error) {
      console.error("Error getting office count:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  // Search offices
  searchOffices: async (req, res) => {
    try {
      const { search } = req.query;
      const companyId = process.env.COMPANY_ID;
      
      if (!search) {
        return res.status(400).json({
          success: false,
          message: "Search query is required",
        });
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID not configured",
        });
      }
      
      // Search only within company offices
      const offices = await CompanyOffice.searchOffices(search, companyId);
      
      res.json({
        success: true,
        message: "Offices search completed successfully",
        data: offices,
      });
    } catch (error) {
      console.error("Error searching offices:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  // Get office with company details
  getOfficeWithCompanyDetails: async (req, res) => {
    try {
      const { officeId } = req.params;
      
      const office = await CompanyOffice.getOfficeWithCompanyDetails(officeId);
      
      if (!office) {
        return res.status(404).json({
          success: false,
          message: "Office not found",
        });
      }

      // Verify office belongs to the current company
      const companyId = process.env.COMPANY_ID;
      if (office.companyId !== companyId) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this office",
        });
      }
      
      res.json({
        success: true,
        message: "Office with company details retrieved successfully",
        data: office,
      });
    } catch (error) {
      console.error("Error getting office with company details:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  // Get current company offices (main method to use)
  getCurrentCompanyOffices: async (req, res) => {
    try {
      const companyId = process.env.COMPANY_ID;
      
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID not configured",
        });
      }
      
      const offices = await CompanyOffice.getOfficesByCompanyId(companyId);
      
      res.json({
        success: true,
        message: "Company offices retrieved successfully",
        data: offices,
      });
    } catch (error) {
      console.error("Error getting company offices:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  },
};

// Get current company offices (main method to use)
getCurrentCompanyOffices: async (req, res) => {
    try {
        const companyId = process.env.COMPANY_ID;
        
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Company ID not configured",
            });
        }
        
        const offices = await CompanyOffice.getOfficesByCompanyId(companyId);
        
        res.json({
            success: true,
            message: "Company offices retrieved successfully",
            data: offices,
        });
    } catch (error) {
        console.error("Error getting company offices:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
},

module.exports = companyOfficeController;