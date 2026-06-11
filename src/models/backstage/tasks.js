const { v4: uuid } = require("uuid");
const dbPool = require("../../config/db");
const ensureBackstageTables = require("./ensure-backstage-tables");

const mapTask = (row) => ({
  ...row,
  story_points: Number(row.story_points || 0),
  effort_hours: Number(row.effort_hours || 0),
  update_count: Number(row.update_count || 0),
  latest_effort_hours: Number(row.latest_effort_hours || 0),
  task_code: row.task_no ? `PBS-${String(row.task_no).padStart(4, "0")}` : row.task_code,
});

const mapTaskUpdate = (row) => ({
  ...row,
  effort_hours: Number(row.effort_hours || 0),
});

const listTasks = async ({
  page = 1,
  limit = 50,
  search = "",
  status = "",
  priority = "",
  assignee_role = "",
  project_id = "",
}) => {
  const client = await dbPool.connect();

  try {
    await ensureBackstageTables(client);

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.max(Number(limit) || 50, 1);
    const offset = (safePage - 1) * safeLimit;
    const normalizedSearch = String(search || "").trim().toLowerCase();

    const params = [
      normalizedSearch,
      String(status || "").trim().toLowerCase(),
      String(priority || "").trim().toLowerCase(),
      String(assignee_role || "").trim().toLowerCase(),
      String(project_id || "").trim(),
    ];

    const whereClause = `
      WHERE (
        $1 = ''
        OR LOWER(bt.title) LIKE '%' || $1 || '%'
        OR LOWER(bt.assignee_name) LIKE '%' || $1 || '%'
        OR LOWER(bp.name) LIKE '%' || $1 || '%'
        OR LOWER(COALESCE(bt.reporter_name, '')) LIKE '%' || $1 || '%'
      )
        AND ($2 = '' OR bt.status = $2)
        AND ($3 = '' OR bt.priority = $3)
        AND ($4 = '' OR bt.assignee_role = $4)
        AND ($5 = '' OR bt.project_id::text = $5)
    `;

    const countResult = await client.query(
      `
        SELECT COUNT(*)::int AS total_data
        FROM backstage_tasks bt
        INNER JOIN backstage_projects bp
          ON bp.id = bt.project_id
        ${whereClause}
      `,
      params
    );

    const result = await client.query(
      `
        SELECT
          bt.*,
          bp.name AS project_name,
          bp.code AS project_code,
          COUNT(btu.id)::int AS update_count,
          COALESCE(SUM(btu.effort_hours), 0) AS latest_effort_hours
        FROM backstage_tasks bt
        INNER JOIN backstage_projects bp
          ON bp.id = bt.project_id
        LEFT JOIN backstage_task_updates btu
          ON btu.task_id = bt.id
        ${whereClause}
        GROUP BY bt.id, bp.name, bp.code
        ORDER BY
          CASE bt.status
            WHEN 'blocked' THEN 0
            WHEN 'in_progress' THEN 1
            WHEN 'review' THEN 2
            WHEN 'todo' THEN 3
            WHEN 'backlog' THEN 4
            ELSE 5
          END,
          bt.updated_at DESC
        LIMIT $6 OFFSET $7
      `,
      [...params, safeLimit, offset]
    );

    return {
      data: result.rows.map(mapTask),
      pagination: {
        totalData: countResult.rows[0]?.total_data || 0,
        totalPage: Math.ceil((countResult.rows[0]?.total_data || 0) / safeLimit),
        rowPerPage: safeLimit,
        currentPage: safePage,
      },
    };
  } finally {
    client.release();
  }
};

const getTaskDetail = async (taskId) => {
  const client = await dbPool.connect();

  try {
    await ensureBackstageTables(client);

    const taskResult = await client.query(
      `
        SELECT
          bt.*,
          bp.name AS project_name,
          bp.code AS project_code,
          bp.repo_url AS project_repo_url,
          bp.default_branch AS project_default_branch
        FROM backstage_tasks bt
        INNER JOIN backstage_projects bp
          ON bp.id = bt.project_id
        WHERE bt.id = $1
        LIMIT 1
      `,
      [taskId]
    );

    if (!taskResult.rows[0]) {
      const error = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    const updatesResult = await client.query(
      `
        SELECT *
        FROM backstage_task_updates
        WHERE task_id = $1
        ORDER BY created_at DESC
      `,
      [taskId]
    );

    return {
      ...mapTask(taskResult.rows[0]),
      updates: updatesResult.rows.map(mapTaskUpdate),
    };
  } finally {
    client.release();
  }
};

const createTask = async (payload) => {
  const client = await dbPool.connect();

  try {
    await ensureBackstageTables(client);

    const result = await client.query(
      `
        INSERT INTO backstage_tasks (
          id,
          project_id,
          title,
          description,
          acceptance_criteria,
          status,
          priority,
          assignee_name,
          assignee_role,
          reporter_name,
          sprint_name,
          story_points,
          effort_hours,
          start_date,
          due_date,
          completed_at,
          result_summary,
          created_by,
          updated_by,
          created_at,
          updated_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          CASE WHEN $6 = 'done' THEN NOW() ELSE NULL END,
          $16, $17, $17, NOW(), NOW()
        )
        RETURNING *
      `,
      [
        uuid(),
        payload.project_id,
        payload.title.trim(),
        payload.description || "",
        payload.acceptance_criteria || "",
        payload.status,
        payload.priority,
        payload.assignee_name || "",
        payload.assignee_role,
        payload.reporter_name || "",
        payload.sprint_name || "",
        payload.story_points || 0,
        payload.effort_hours || 0,
        payload.start_date || null,
        payload.due_date || null,
        payload.result_summary || "",
        payload.actor || "",
      ]
    );

    return mapTask(result.rows[0]);
  } finally {
    client.release();
  }
};

const updateTask = async (payload) => {
  const client = await dbPool.connect();

  try {
    await ensureBackstageTables(client);

    const result = await client.query(
      `
        UPDATE backstage_tasks
        SET
          project_id = $2,
          title = $3,
          description = $4,
          acceptance_criteria = $5,
          status = $6,
          priority = $7,
          assignee_name = $8,
          assignee_role = $9,
          reporter_name = $10,
          sprint_name = $11,
          story_points = $12,
          effort_hours = $13,
          start_date = $14,
          due_date = $15,
          completed_at = CASE
            WHEN $6 = 'done' AND completed_at IS NULL THEN NOW()
            WHEN $6 <> 'done' THEN NULL
            ELSE completed_at
          END,
          result_summary = $16,
          updated_by = $17,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        payload.taskId,
        payload.project_id,
        payload.title.trim(),
        payload.description || "",
        payload.acceptance_criteria || "",
        payload.status,
        payload.priority,
        payload.assignee_name || "",
        payload.assignee_role,
        payload.reporter_name || "",
        payload.sprint_name || "",
        payload.story_points || 0,
        payload.effort_hours || 0,
        payload.start_date || null,
        payload.due_date || null,
        payload.result_summary || "",
        payload.actor || "",
      ]
    );

    if (!result.rows[0]) {
      const error = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    return mapTask(result.rows[0]);
  } finally {
    client.release();
  }
};

const deleteTask = async (taskId) => {
  const client = await dbPool.connect();

  try {
    await ensureBackstageTables(client);

    const result = await client.query(
      `
        DELETE FROM backstage_tasks
        WHERE id = $1
        RETURNING id, task_no, title
      `,
      [taskId]
    );

    if (!result.rows[0]) {
      const error = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    return {
      ...result.rows[0],
      task_code: result.rows[0].task_no
        ? `PBS-${String(result.rows[0].task_no).padStart(4, "0")}`
        : "",
    };
  } finally {
    client.release();
  }
};

const createTaskUpdate = async (payload) => {
  const client = await dbPool.connect();

  try {
    await ensureBackstageTables(client);

    const taskCheck = await client.query(
      `SELECT id FROM backstage_tasks WHERE id = $1 LIMIT 1`,
      [payload.taskId]
    );

    if (!taskCheck.rows[0]) {
      const error = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    const result = await client.query(
      `
        INSERT INTO backstage_task_updates (
          id,
          task_id,
          summary,
          result_snapshot,
          repo_url,
          branch_name,
          commit_url,
          pull_request_url,
          effort_hours,
          created_by,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING *
      `,
      [
        uuid(),
        payload.taskId,
        payload.summary.trim(),
        payload.result_snapshot || "",
        payload.repo_url || "",
        payload.branch_name || "",
        payload.commit_url || "",
        payload.pull_request_url || "",
        payload.effort_hours || 0,
        payload.actor || "",
      ]
    );

    await client.query(
      `
        UPDATE backstage_tasks
        SET
          effort_hours = COALESCE(effort_hours, 0) + $2,
          updated_by = $3,
          updated_at = NOW()
        WHERE id = $1
      `,
      [payload.taskId, payload.effort_hours || 0, payload.actor || ""]
    );

    return mapTaskUpdate(result.rows[0]);
  } finally {
    client.release();
  }
};

module.exports = {
  listTasks,
  getTaskDetail,
  createTask,
  updateTask,
  deleteTask,
  createTaskUpdate,
};
