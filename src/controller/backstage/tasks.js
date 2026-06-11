const models = require("../../models");

const actorFromRequest = (req) =>
  req.user?.fullname || req.user?.username || req.user?.email || "system";

const listBackstageTasksController = async (req, res) => {
  try {
    const result = await models.listBackstageTasks(req.query);
    return res.status(200).json({ success: true, message: "Tasks loaded successfully", ...result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Failed to load tasks" });
  }
};

const getBackstageTaskDetailController = async (req, res) => {
  try {
    const data = await models.getBackstageTaskDetail(req.params.taskId);
    return res.status(200).json({ success: true, message: "Task detail loaded successfully", data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Failed to load task detail" });
  }
};

const createBackstageTaskController = async (req, res) => {
  try {
    const data = await models.createBackstageTask({ ...req.body, actor: actorFromRequest(req) });
    return res.status(201).json({ success: true, message: "Task created successfully", data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Failed to create task" });
  }
};

const updateBackstageTaskController = async (req, res) => {
  try {
    const data = await models.updateBackstageTask({
      taskId: req.params.taskId,
      ...req.body,
      actor: actorFromRequest(req),
    });
    return res.status(200).json({ success: true, message: "Task updated successfully", data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Failed to update task" });
  }
};

const deleteBackstageTaskController = async (req, res) => {
  try {
    const data = await models.deleteBackstageTask(req.params.taskId);
    return res.status(200).json({ success: true, message: "Task deleted successfully", data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Failed to delete task" });
  }
};

const createBackstageTaskUpdateController = async (req, res) => {
  try {
    const data = await models.createBackstageTaskUpdate({
      taskId: req.params.taskId,
      ...req.body,
      actor: actorFromRequest(req),
    });
    return res.status(201).json({ success: true, message: "Task update created successfully", data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Failed to create task update" });
  }
};

module.exports = {
  listBackstageTasksController,
  getBackstageTaskDetailController,
  createBackstageTaskController,
  updateBackstageTaskController,
  deleteBackstageTaskController,
  createBackstageTaskUpdateController,
};
