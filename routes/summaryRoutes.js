const express = require("express");
const { getMyPickupSummary } = require("../controllers/summaryController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/my-pickups", protect, allowRoles("customer"), getMyPickupSummary);

module.exports = router;
