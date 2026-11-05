const express = require("express");

const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const controller = require("../controller/gold-issue.controller");

const router = express.Router();

router.post(
  "/",
  requireAuth,
  requireRole("ISSUE_CLERK", "FINANCE_HEAD"),
  controller.create,
);

module.exports = router;
