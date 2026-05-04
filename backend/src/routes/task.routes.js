const express = require("express");
const {
  createTask,
  deleteTask,
  getDashboardStats,
  getProjectTasks,
  updateTaskStatus,
} = require("../controllers/task.controller");
const { authorize, protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", protect, authorize("admin"), createTask);
router.get("/dashboard", protect, getDashboardStats);
router.get("/project/:projectId", protect, getProjectTasks);
router.patch("/:id/status", protect, updateTaskStatus);
router.delete("/:id", protect, deleteTask);

module.exports = router;
