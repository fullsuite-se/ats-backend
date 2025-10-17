const express = require("express");
const router = express.Router();
const companyOfficeController = require("../../controllers/jobs/officeController");

// Office routes
router.get("/", companyOfficeController.getAllOffices);
router.get("/current-company", companyOfficeController.getCurrentCompanyOffices);
router.get("/search", companyOfficeController.searchOffices);
router.get("/count/:companyId", companyOfficeController.getOfficeCountByCompanyId);
router.get("/company/:companyId", companyOfficeController.getOfficesByCompanyId);
router.get("/:officeId", companyOfficeController.getOfficeById);
router.get("/:officeId/details", companyOfficeController.getOfficeWithCompanyDetails);
router.post("/", companyOfficeController.createOffice);
router.put("/:officeId", companyOfficeController.updateOffice);
router.delete("/company/:companyId", companyOfficeController.deleteOfficesByCompanyId);
router.delete("/:officeId", companyOfficeController.deleteOffice);


module.exports = router;