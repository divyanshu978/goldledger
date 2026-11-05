const express = require("express");

const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const controller = require("../controller/karigar-ledger.controller");

const router = express.Router();

router.get(
  "/:id/ledger",
  requireAuth,
  requireRole("ISSUE_CLERK", "FINANCE_HEAD"),
  controller.get,
);

module.exports = router;
