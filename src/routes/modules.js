const express = require("express");
const db = require("../db");

const router = express.Router();

function normalizeModulePayload(payload) {
  return {
    name: typeof payload.name === "string" ? payload.name.trim() : payload.name,
    icon: typeof payload.icon === "string" ? payload.icon.trim() : payload.icon,
    path:
      payload.path === null
        ? null
        : typeof payload.path === "string"
          ? payload.path.trim()
          : payload.path,
    code: typeof payload.code === "string" ? payload.code.trim() : payload.code,
    moduleList: Array.isArray(payload.moduleList)
      ? payload.moduleList
      : payload.moduleList,
  };
}

function validateModuleTree(payload, path = "module", seenCodes = new Set()) {
  const errors = [];

  if (
    typeof payload !== "object" ||
    payload === null ||
    Array.isArray(payload)
  ) {
    return [`${path} must be an object`];
  }

  const normalized = normalizeModulePayload(payload);

  if (
    typeof normalized.name !== "string" ||
    normalized.name.length < 1 ||
    normalized.name.length > 120
  ) {
    errors.push(`${path}.name must be a string between 1 and 120 characters`);
  }

  if (
    typeof normalized.icon !== "string" ||
    normalized.icon.length < 1 ||
    normalized.icon.length > 80
  ) {
    errors.push(`${path}.icon must be a string between 1 and 80 characters`);
  }

  if (normalized.path !== null && typeof normalized.path !== "string") {
    errors.push(`${path}.path must be a string or null`);
  }

  if (typeof normalized.path === "string") {
    if (normalized.path.length > 255) {
      errors.push(`${path}.path must be at most 255 characters`);
    }

    if (normalized.path.length > 0 && !normalized.path.startsWith("/")) {
      errors.push(`${path}.path must start with '/' when provided`);
    }
  }

  if (
    typeof normalized.code !== "string" ||
    normalized.code.length < 1 ||
    normalized.code.length > 30
  ) {
    errors.push(`${path}.code must be a string between 1 and 30 characters`);
  }

  if (typeof normalized.code === "string") {
    const code = normalized.code.toUpperCase();
    if (!/^[A-Z0-9_]+$/.test(code)) {
      errors.push(`${path}.code can contain only A-Z, 0-9, and _`);
    } else if (seenCodes.has(code)) {
      errors.push(`${path}.code must be unique in request body`);
    } else {
      seenCodes.add(code);
    }
  }

  if (!Array.isArray(normalized.moduleList)) {
    errors.push(`${path}.moduleList must be an array`);
  } else {
    for (let index = 0; index < normalized.moduleList.length; index += 1) {
      const child = normalized.moduleList[index];
      errors.push(
        ...validateModuleTree(child, `${path}.moduleList[${index}]`, seenCodes),
      );
    }
  }

  return errors;
}

function buildModuleTree(rows) {
  const nodeMap = new Map();
  const roots = [];

  for (const row of rows) {
    nodeMap.set(row.id, {
      id: row.id,
      name: row.name,
      icon: row.icon,
      path: row.path,
      code: row.code,
      moduleList: [],
      _parentId: row.parent_id,
      _sortOrder: row.sort_order,
    });
  }

  for (const node of nodeMap.values()) {
    if (node._parentId && nodeMap.has(node._parentId)) {
      nodeMap.get(node._parentId).moduleList.push(node);
    } else {
      roots.push(node);
    }
  }

  function sortAndStrip(items) {
    items.sort((a, b) => a._sortOrder - b._sortOrder || a.id - b.id);
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      icon: item.icon,
      path: item.path,
      code: item.code,
      moduleList: sortAndStrip(item.moduleList),
    }));
  }

  return sortAndStrip(roots);
}

async function insertModuleNode(client, node, parentId, sortOrder) {
  const normalized = normalizeModulePayload(node);
  const result = await client.query(
    `
      INSERT INTO modules (name, icon, path, code, parent_id, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, icon, path, code
    `,
    [
      normalized.name,
      normalized.icon,
      normalized.path,
      normalized.code.toUpperCase(),
      parentId,
      sortOrder,
    ],
  );

  const inserted = result.rows[0];
  const children = [];

  for (let index = 0; index < normalized.moduleList.length; index += 1) {
    const child = normalized.moduleList[index];
    const insertedChild = await insertModuleNode(
      client,
      child,
      inserted.id,
      index,
    );
    children.push(insertedChild);
  }

  return {
    id: inserted.id,
    name: inserted.name,
    icon: inserted.icon,
    path: inserted.path,
    code: inserted.code,
    moduleList: children,
  };
}

router.post("/", async (req, res, next) => {
  const payload = req.body || {};
  const errors = validateModuleTree(payload);

  if (errors.length > 0) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const created = await insertModuleNode(client, payload, null, 0);
    await client.query("COMMIT");

    return res.status(201).json({
      message: "Module created successfully",
      module: created,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "A module with this code already exists" });
    }

    return next(error);
  } finally {
    client.release();
  }
});

router.get("/", async (_req, res, next) => {
  try {
    const result = await db.query(
      `
        SELECT id, name, icon, path, code, parent_id, sort_order
        FROM modules
        ORDER BY COALESCE(parent_id, 0), sort_order, id
      `,
    );

    return res.status(200).json({
      message: "Modules fetched successfully",
      modules: buildModuleTree(result.rows),
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  const moduleId = Number(req.params.id);

  if (!Number.isInteger(moduleId) || moduleId <= 0) {
    return res
      .status(400)
      .json({ message: "module id must be a positive integer" });
  }

  try {
    const result = await db.query(
      `
        WITH RECURSIVE module_tree AS (
          SELECT id, name, icon, path, code, parent_id, sort_order
          FROM modules
          WHERE id = $1

          UNION ALL

          SELECT m.id, m.name, m.icon, m.path, m.code, m.parent_id, m.sort_order
          FROM modules m
          INNER JOIN module_tree mt ON m.parent_id = mt.id
        )
        SELECT id, name, icon, path, code, parent_id, sort_order
        FROM module_tree
      `,
      [moduleId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Module not found" });
    }

    const tree = buildModuleTree(result.rows);
    return res.status(200).json({
      message: "Module fetched successfully",
      module: tree[0],
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  const moduleId = Number(req.params.id);
  const payload = req.body || {};

  if (!Number.isInteger(moduleId) || moduleId <= 0) {
    return res
      .status(400)
      .json({ message: "module id must be a positive integer" });
  }

  const errors = validateModuleTree(payload);
  if (errors.length > 0) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id FROM modules WHERE id = $1 LIMIT 1",
      [moduleId],
    );

    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Module not found" });
    }

    await client.query(
      `
        WITH RECURSIVE descendants AS (
          SELECT id
          FROM modules
          WHERE parent_id = $1

          UNION ALL

          SELECT m.id
          FROM modules m
          INNER JOIN descendants d ON m.parent_id = d.id
        )
        DELETE FROM modules
        WHERE id IN (SELECT id FROM descendants)
      `,
      [moduleId],
    );

    const normalized = normalizeModulePayload(payload);

    await client.query(
      `
        UPDATE modules
        SET name = $1,
            icon = $2,
            path = $3,
            code = $4,
            updated_at = NOW()
        WHERE id = $5
      `,
      [
        normalized.name,
        normalized.icon,
        normalized.path,
        normalized.code.toUpperCase(),
        moduleId,
      ],
    );

    const children = [];
    for (let index = 0; index < normalized.moduleList.length; index += 1) {
      const child = normalized.moduleList[index];
      const insertedChild = await insertModuleNode(
        client,
        child,
        moduleId,
        index,
      );
      children.push(insertedChild);
    }

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Module updated successfully",
      module: {
        id: moduleId,
        name: normalized.name,
        icon: normalized.icon,
        path: normalized.path,
        code: normalized.code.toUpperCase(),
        moduleList: children,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "A module with this code already exists" });
    }

    return next(error);
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res, next) => {
  const moduleId = Number(req.params.id);

  if (!Number.isInteger(moduleId) || moduleId <= 0) {
    return res
      .status(400)
      .json({ message: "module id must be a positive integer" });
  }

  try {
    const result = await db.query("DELETE FROM modules WHERE id = $1", [
      moduleId,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Module not found" });
    }

    return res.status(200).json({ message: "Module deleted successfully" });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
