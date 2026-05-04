const mongoose = require("mongoose");
const Project = require("../models/project.model");
const Task = require("../models/task.model");
const User = require("../models/user.model");

const VALID_STATUSES = ["todo", "in-progress", "done"];
const VALID_PRIORITIES = ["low", "medium", "high"];
const userPopulateFields = "name email role";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const isSameId = (firstId, secondId) => {
  return firstId.toString() === secondId.toString();
};

const isProjectMember = (project, userId) => {
  return (
    isSameId(project.owner, userId) ||
    project.members.some((memberId) => isSameId(memberId, userId))
  );
};

const populateTask = (query) => {
  return query
    .populate("assignedTo", userPopulateFields)
    .populate("createdBy", userPopulateFields)
    .populate({
      path: "project",
      select: "name description owner members createdAt updatedAt",
      populate: [
        { path: "owner", select: userPopulateFields },
        { path: "members", select: userPopulateFields },
      ],
    });
};

const getProjectOrError = async (projectId) => {
  if (!isValidObjectId(projectId)) {
    return { status: 400, message: "Invalid project id" };
  }

  const project = await Project.findById(projectId);

  if (!project) {
    return { status: 404, message: "Project not found" };
  }

  return { project };
};

const getTaskOrError = async (taskId) => {
  if (!isValidObjectId(taskId)) {
    return { status: 400, message: "Invalid task id" };
  }

  const task = await Task.findById(taskId);

  if (!task) {
    return { status: 404, message: "Task not found" };
  }

  return { task };
};

const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      project: projectId,
      assignedTo,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Task title is required" });
    }

    if (!dueDate) {
      return res.status(400).json({ message: "Due date is required" });
    }

    if (!projectId) {
      return res.status(400).json({ message: "Project id is required" });
    }

    if (!assignedTo) {
      return res.status(400).json({ message: "Assigned user id is required" });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid task status" });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: "Invalid task priority" });
    }

    if (!isValidObjectId(assignedTo)) {
      return res.status(400).json({ message: "Invalid assigned user id" });
    }

    const parsedDueDate = new Date(dueDate);

    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ message: "Invalid due date" });
    }

    const projectResult = await getProjectOrError(projectId);

    if (projectResult.status) {
      return res
        .status(projectResult.status)
        .json({ message: projectResult.message });
    }

    const assignedUser = await User.findById(assignedTo);

    if (!assignedUser) {
      return res.status(404).json({ message: "Assigned user not found" });
    }

    if (!isProjectMember(projectResult.project, assignedUser._id)) {
      return res.status(400).json({
        message: "Assigned user must be a member of the project",
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      status: status || "todo",
      priority: priority || "medium",
      dueDate: parsedDueDate,
      project: projectResult.project._id,
      assignedTo: assignedUser._id,
      createdBy: req.user._id,
    });

    const populatedTask = await populateTask(Task.findById(task._id));

    return res.status(201).json({
      message: "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }

    return res.status(500).json({ message: "Unable to create task" });
  }
};

const getProjectTasks = async (req, res) => {
  try {
    const projectResult = await getProjectOrError(req.params.projectId);

    if (projectResult.status) {
      return res
        .status(projectResult.status)
        .json({ message: projectResult.message });
    }

    if (!isProjectMember(projectResult.project, req.user._id)) {
      return res.status(403).json({
        message: "You do not have permission to view tasks for this project",
      });
    }

    const tasks = await populateTask(
      Task.find({ project: projectResult.project._id }).sort({
        dueDate: 1,
        createdAt: -1,
      })
    );

    return res.status(200).json({ tasks });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch tasks" });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const visibilityFilter =
      req.user.role === "admin" ? {} : { assignedTo: req.user._id };
    const assignedToMeFilter = { assignedTo: req.user._id };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalTasks,
      todoTasks,
      inProgressTasks,
      doneTasks,
      overdueTasks,
      myAssignedTasks,
      recentTasks,
    ] = await Promise.all([
      Task.countDocuments(visibilityFilter),
      Task.countDocuments({ ...visibilityFilter, status: "todo" }),
      Task.countDocuments({ ...visibilityFilter, status: "in-progress" }),
      Task.countDocuments({ ...visibilityFilter, status: "done" }),
      Task.countDocuments({
        ...visibilityFilter,
        dueDate: { $lt: today },
        status: { $ne: "done" },
      }),
      Task.countDocuments(assignedToMeFilter),
      populateTask(Task.find(visibilityFilter).sort({ createdAt: -1 }).limit(5)),
    ]);

    return res.status(200).json({
      stats: {
        totalTasks,
        todoTasks,
        inProgressTasks,
        doneTasks,
        overdueTasks,
        myAssignedTasks,
      },
      recentTasks,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch dashboard stats" });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid task status" });
    }

    const taskResult = await getTaskOrError(req.params.id);

    if (taskResult.status) {
      return res.status(taskResult.status).json({ message: taskResult.message });
    }

    const project = await Project.findById(taskResult.task.project);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const canUpdate =
      req.user.role === "admin" ||
      isSameId(taskResult.task.assignedTo, req.user._id) ||
      isSameId(project.owner, req.user._id);

    if (!canUpdate) {
      return res.status(403).json({
        message: "You do not have permission to update this task",
      });
    }

    taskResult.task.status = status;
    await taskResult.task.save();

    const populatedTask = await populateTask(Task.findById(taskResult.task._id));

    return res.status(200).json({
      message: "Task status updated successfully",
      task: populatedTask,
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update task status" });
  }
};

const deleteTask = async (req, res) => {
  try {
    const taskResult = await getTaskOrError(req.params.id);

    if (taskResult.status) {
      return res.status(taskResult.status).json({ message: taskResult.message });
    }

    const project = await Project.findById(taskResult.task.project);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const canDelete =
      req.user.role === "admin" || isSameId(project.owner, req.user._id);

    if (!canDelete) {
      return res.status(403).json({
        message: "Only an admin or the project owner can delete this task",
      });
    }

    await taskResult.task.deleteOne();

    return res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to delete task" });
  }
};

module.exports = {
  createTask,
  getDashboardStats,
  getProjectTasks,
  updateTaskStatus,
  deleteTask,
};
