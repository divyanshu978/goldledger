const express = require("express");

const { requireAuth } = require("../middleware/auth.middleware");
const controller = require("../controller/dashboard.controller");

const router = express.Router();

router.get("/", requireAuth, controller.get);

module.exports = router;
