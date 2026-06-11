const { v4: uuid } = require("uuid");
const dbPool = require("../../config/db");
const ensureBackstageTables = require("./ensure-backstage-tables");

const normalizeProject = (row) => ({
  ...row,
  total_tasks: Number(row.total_tasks || 0),
  completed_tasks: Number(row.completed_tasks || 0),
  in_progress_tasks: Number(row.in_progress_tasks || 0),
});

const listProjects = async ({ page = 1, limit = 50, search = "", status = "" }) => {
  const client = await dbPool.connect();

  try {
    await ensureBackstageTables(client);

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.max(Number(limit) || 50, 1);
    const offset = (safePage - 1) * safeLimit;
    const normalizedSearch = String(search || "").trim().toLowerCase();
    const normalizedStatus = String(status || "").trim().toLowerCase();

    const params = [normalizedSearch, normalizedStatus];

    const countResult = await client.query(
      `
        SELECT COUNT(*)::int AS total_data
        FROM backstage_projects bp
        WHERE (
          $1 = ''
          OR LOWER(bp.code) LIKE '%' || $1 || '%'
          OR LOWER(bp.name) LIKE '%' || $1 || '%'
          OR LOWER(bp.owner_name) LIKE '%' || $1 || '%'
        )
          AND ($2 = '' OR bp.status = $2)
      `,
      params
    );

    const result = await client.query(
      `
        SELECT
          bp.*,
          COUNT(bt.id)::int AS total_tasks,
          COUNT(*) FILTER (WHERE bt.status = 'done')::int AS completed_tasks,
          COUNT(*) FILTER (WHERE bt.status IN ('in_progress', 'review', 'blocked'))::int AS in_progress_tasks
        FROM backstage_projects bp
        LEFT JOIN backstage_tasks bt
          ON bt.project_id = bp.id
        WHERE (
          $1 = ''
          OR LOWER(bp.code) LIKE '%' || $1 || '%'
          OR LOWER(bp.name) LIKE '%' || $1 || '%'
          OR LOWER(bp.owner_name) LIKE '%' || $1 || '%'
        )
          AND ($2 = '' OR bp.status = $2)
        GROUP BY bp.id
        ORDER BY bp.updated_at DESC, bp.created_at DESC
        LIMIT $3 OFFSET $4
      `,
      [...params, safeLimit, offset]
    );

    return {
      data: result.rows.map(normalizeProject),
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

const getProjectDetail = async (projectId) => {
  const client = await dbPool.connect();

  try {
    await ensureBackstageTables(client);

    const result = await client.query(
      `
        SELECT
          bp.*,
          COUNT(bt.id)::int AS total_tasks,
          COUNT(*) FILTER (WHERE bt.status = 'done')::int AS completed_tasks,
          COUNT(*) FILTER (WHERE bt.status IN ('in_progress', 'review', 'blocked'))::int AS in_progress_tasks
        FROM backstage_projects bp
        LEFT JOIN backstage_tasks bt
          ON bt.project_id = bp.id
        WHERE bp.id = $1
        GROUP BY bp.id
        LIMIT 1
      `,
      [projectId]
    );

    if (!result.rows[0]) {
      const error = new Error("Project not found");
      error.statusCode = 404;
      throw error;
    }

    return normalizeProject(result.rows[0]);
  } finally {
    client.release();
  }
};

const createProject = async (payload) => {
  const client = await dbPool.connect();

  try {
    await ensureBackstageTables(client);

    const result = await client.query(
      `
        INSERT INTO backstage_projects (
          id,
          code,
          name,
          description,
          owner_name,
          status,
          repo_url,
          default_branch,
          target_release_date,
          created_by,
          updated_by,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, NOW(), NOW())
        RETURNING *
      `,
      [
        uuid(),
        payload.code.trim().toUpperCase(),
        payload.name.trim(),
        payload.description || "",
        payload.owner_name || "",
        payload.status,
        payload.repo_url || "",
        payload.default_branch || "",
        payload.target_release_date || null,
        payload.actor || "",
      ]
    );

    return normalizeProject(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      const duplicateError = new Error("Project code already exists");
      duplicateError.statusCode = 400;
      throw duplicateError;
    }

    throw error;
  } finally {
    client.release();
  }
};

const updateProject = async (payload) => {
  const client = await dbPool.connect();

  try {
    await ensureBackstageTables(client);

    const result = await client.query(
      `
        UPDATE backstage_projects
        SET
          code = $2,
          name = $3,
          description = $4,
          owner_name = $5,
          status = $6,
          repo_url = $7,
          default_branch = $8,
          target_release_date = $9,
          updated_by = $10,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        payload.projectId,
        payload.code.trim().toUpperCase(),
        payload.name.trim(),
        payload.description || "",
        payload.owner_name || "",
        payload.status,
        payload.repo_url || "",
        payload.default_branch || "",
        payload.target_release_date || null,
        payload.actor || "",
      ]
    );

    if (!result.rows[0]) {
      const error = new Error("Project not found");
      error.statusCode = 404;
      throw error;
    }

    return normalizeProject(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      const duplicateError = new Error("Project code already exists");
      duplicateError.statusCode = 400;
      throw duplicateError;
    }

    throw error;
  } finally {
    client.release();
  }
};

const deleteProject = async (projectId) => {
  const client = await dbPool.connect();

  try {
    await ensureBackstageTables(client);

    const result = await client.query(
      `
        DELETE FROM backstage_projects
        WHERE id = $1
        RETURNING id, code, name
      `,
      [projectId]
    );

    if (!result.rows[0]) {
      const error = new Error("Project not found");
      error.statusCode = 404;
      throw error;
    }

    return result.rows[0];
  } finally {
    client.release();
  }
};

module.exports = {
  listProjects,
  getProjectDetail,
  createProject,
  updateProject,
  deleteProject,
};
