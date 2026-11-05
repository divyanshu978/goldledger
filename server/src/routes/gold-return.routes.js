const express = require("express");

const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const controller = require("../controller/gold-return.controller");

const router = express.Router();

router.use(requireAuth, requireRole("ISSUE_CLERK", "FINANCE_HEAD"));
router.get("/jobs", controller.listJobs);
router.post("/", controller.create);

module.exports = router;
