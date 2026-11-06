const express = require("express");

const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const controller = require("../controller/wastage.controller");

const router = express.Router();

router.use(requireAuth);
router.get("/", requireRole("FINANCE_HEAD"), controller.list);
router.get("/:jobId", requireRole("FINANCE_HEAD"), controller.get);
router.post("/:jobId/submit", requireRole("FINANCE_HEAD"), controller.submit);
router.patch("/:alertId/resolve", requireRole("FINANCE_HEAD"), controller.resolve);

module.exports = router;
