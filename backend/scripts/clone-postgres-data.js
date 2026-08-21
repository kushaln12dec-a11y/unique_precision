const { Client } = require("pg");

const REQUIRED_CONFIRMATION = "true";
const INTERNAL_SCHEMAS = new Set([
  "information_schema",
  "pg_catalog",
  "pg_toast",
]);

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;
const confirmClone = process.env.CONFIRM_CLONE;

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;
const qname = (schema, table) => `${quoteIdent(schema)}.${quoteIdent(table)}`;

const redactUrl = (rawUrl) => {
  try {
    const url = new URL(rawUrl);
    if (url.username) url.username = "***";
    if (url.password) url.password = "***";
    return url.toString();
  } catch (_error) {
    return "***";
  }
};

const getDbIdentity = (rawUrl) => {
  const url = new URL(rawUrl);
  return {
    host: url.hostname,
    port: url.port || "5432",
    database: url.pathname.replace(/^\/+/, ""),
    username: decodeURIComponent(url.username || ""),
  };
};

const assertConfig = () => {
  if (!sourceUrl) {
    throw new Error("SOURCE_DATABASE_URL is required.");
  }
  if (!targetUrl) {
    throw new Error("TARGET_DATABASE_URL or DATABASE_URL is required.");
  }
  if (confirmClone !== REQUIRED_CONFIRMATION) {
    throw new Error("Set CONFIRM_CLONE=true to allow target truncation and copy.");
  }

  const source = getDbIdentity(sourceUrl);
  const target = getDbIdentity(targetUrl);
  const sameDb =
    source.host === target.host &&
    source.port === target.port &&
    source.database === target.database &&
    source.username === target.username;

  if (sameDb) {
    throw new Error("Source and target appear to be the same database. Refusing to continue.");
  }
};

const getTables = async (client) => {
  const result = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT LIKE 'pg_%'
      AND table_schema <> 'information_schema'
    ORDER BY table_schema, table_name
  `);

  return result.rows.filter((row) => !INTERNAL_SCHEMAS.has(row.table_schema));
};

const sortTablesByDependencies = async (client, tables) => {
  const tableKeys = new Set(
    tables.map((table) => `${table.table_schema}.${table.table_name}`)
  );
  const dependencies = new Map(tables.map((table) => [
    `${table.table_schema}.${table.table_name}`,
    new Set(),
  ]));
  const tableByKey = new Map(
    tables.map((table) => [`${table.table_schema}.${table.table_name}`, table])
  );

  const result = await client.query(`
    SELECT
      child_ns.nspname AS child_schema,
      child.relname AS child_table,
      parent_ns.nspname AS parent_schema,
      parent.relname AS parent_table
    FROM pg_constraint constraint_row
    JOIN pg_class child ON child.oid = constraint_row.conrelid
    JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
    JOIN pg_class parent ON parent.oid = constraint_row.confrelid
    JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
    WHERE constraint_row.contype = 'f'
  `);

  result.rows.forEach((row) => {
    const childKey = `${row.child_schema}.${row.child_table}`;
    const parentKey = `${row.parent_schema}.${row.parent_table}`;
    if (tableKeys.has(childKey) && tableKeys.has(parentKey) && childKey !== parentKey) {
      dependencies.get(childKey).add(parentKey);
    }
  });

  const sorted = [];
  const ready = [...dependencies.entries()]
    .filter(([, parents]) => parents.size === 0)
    .map(([key]) => key)
    .sort();

  while (ready.length > 0) {
    const key = ready.shift();
    sorted.push(tableByKey.get(key));

    for (const [candidateKey, parents] of dependencies.entries()) {
      if (!parents.delete(key)) continue;
      if (parents.size === 0 && !sorted.some((table) => `${table.table_schema}.${table.table_name}` === candidateKey)) {
        ready.push(candidateKey);
        ready.sort();
      }
    }

    dependencies.delete(key);
  }

  if (dependencies.size > 0) {
    throw new Error(
      `Could not resolve table dependency order: ${[...dependencies.keys()].join(", ")}`
    );
  }

  return sorted;
};

const getColumns = async (client, schema, table) => {
  const result = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = $2
      ORDER BY ordinal_position
    `,
    [schema, table]
  );

  return result.rows.map((row) => row.column_name);
};

const copyTable = async (sourceClient, targetClient, table) => {
  const { table_schema: schema, table_name: tableName } = table;
  const columns = await getColumns(sourceClient, schema, tableName);

  if (columns.length === 0) {
    console.log(`Skipping ${schema}.${tableName}: no columns.`);
    return;
  }

  const columnSql = columns.map(quoteIdent).join(", ");
  const sourceRows = await sourceClient.query(
    `SELECT ${columnSql} FROM ${qname(schema, tableName)}`
  );

  if (sourceRows.rowCount === 0) {
    console.log(`Copied ${schema}.${tableName}: 0 row(s).`);
    return;
  }

  const maxParams = 60000;
  const batchSize = Math.max(1, Math.floor(maxParams / columns.length));

  for (let offset = 0; offset < sourceRows.rows.length; offset += batchSize) {
    const rows = sourceRows.rows.slice(offset, offset + batchSize);
    const placeholders = [];
    const values = [];

    rows.forEach((row, rowIndex) => {
      const rowPlaceholders = columns.map((column, columnIndex) => {
        values.push(row[column]);
        return `$${rowIndex * columns.length + columnIndex + 1}`;
      });
      placeholders.push(`(${rowPlaceholders.join(", ")})`);
    });

    await targetClient.query(
      `INSERT INTO ${qname(schema, tableName)} (${columnSql}) VALUES ${placeholders.join(", ")}`,
      values
    );
  }

  console.log(`Copied ${schema}.${tableName}: ${sourceRows.rowCount} row(s).`);
};

const resetTarget = async (targetClient, tables) => {
  if (tables.length === 0) return;

  const tableSql = tables
    .map((table) => qname(table.table_schema, table.table_name))
    .join(", ");

  await targetClient.query(`TRUNCATE TABLE ${tableSql} RESTART IDENTITY CASCADE`);
};

const main = async () => {
  assertConfig();

  const sourceClient = new Client({ connectionString: sourceUrl });
  const targetClient = new Client({ connectionString: targetUrl });

  console.log(`Source: ${redactUrl(sourceUrl)}`);
  console.log(`Target: ${redactUrl(targetUrl)}`);

  await sourceClient.connect();
  await targetClient.connect();

  try {
    const sourceTables = await getTables(sourceClient);
    const targetTables = await getTables(targetClient);
    const targetKeys = new Set(
      targetTables.map((table) => `${table.table_schema}.${table.table_name}`)
    );
    const missing = sourceTables.filter(
      (table) => !targetKeys.has(`${table.table_schema}.${table.table_name}`)
    );

    if (missing.length > 0) {
      throw new Error(
        `Target is missing table(s): ${missing
          .map((table) => `${table.table_schema}.${table.table_name}`)
          .join(", ")}`
      );
    }

    await targetClient.query("BEGIN");
    await targetClient.query("SET CONSTRAINTS ALL DEFERRED");
    const orderedSourceTables = await sortTablesByDependencies(sourceClient, sourceTables);
    await resetTarget(targetClient, targetTables);

    for (const table of orderedSourceTables) {
      await copyTable(sourceClient, targetClient, table);
    }

    await targetClient.query("COMMIT");
    console.log("Clone complete.");
  } catch (error) {
    await targetClient.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
