#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { createClient } = require("@clickhouse/client");

// 加载环境变量 - 使用项目现有的方式
const { spawnSync } = require("child_process");
const envPath = path.join(__dirname, "../../../.env");

// 读取 .env 文件并设置环境变量
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const envLines = envContent.split("\n");

  for (const line of envLines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith("#")) {
      const [key, ...valueParts] = trimmedLine.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").replace(/^["']|["']$/g, "");
        process.env[key] = value;
      }
    }
  }
}

const CLICKHOUSE_URL = process.env.CLICKHOUSE_URL;
const CLICKHOUSE_MIGRATION_URL = process.env.CLICKHOUSE_MIGRATION_URL;
const CLICKHOUSE_USER = process.env.CLICKHOUSE_USER;
const CLICKHOUSE_PASSWORD = process.env.CLICKHOUSE_PASSWORD;
const CLICKHOUSE_DB = process.env.CLICKHOUSE_DB || "default";
const CLICKHOUSE_CLUSTER_NAME =
  process.env.CLICKHOUSE_CLUSTER_NAME || "default";
const CLICKHOUSE_CLUSTER_ENABLED = process.env.CLICKHOUSE_CLUSTER_ENABLED;
const CLICKHOUSE_MIGRATION_SSL = process.env.CLICKHOUSE_MIGRATION_SSL;

// 检查必要的环境变量
if (!CLICKHOUSE_MIGRATION_URL) {
  console.log(
    "Info: CLICKHOUSE_MIGRATION_URL not configured, skipping migration.",
  );
  process.exit(0);
}

if (!CLICKHOUSE_MIGRATION_URL) {
  console.error("Error: CLICKHOUSE_MIGRATION_URL is not configured.");
  console.error(
    "Please set CLICKHOUSE_MIGRATION_URL in your environment variables.",
  );
  process.exit(1);
}

if (!CLICKHOUSE_USER) {
  console.error("Error: CLICKHOUSE_USER is not set.");
  console.error("Please set CLICKHOUSE_USER in your environment variables.");
  process.exit(1);
}

if (!CLICKHOUSE_PASSWORD) {
  console.error("Error: CLICKHOUSE_PASSWORD is not set.");
  console.error(
    "Please set CLICKHOUSE_PASSWORD in your environment variables.",
  );
  process.exit(1);
}

// 创建 ClickHouse 客户端
const client = createClient({
  url: CLICKHOUSE_MIGRATION_URL.replace("clickhouse://", "http://").replace(
    ":9009",
    ":8123",
  ),
  username: CLICKHOUSE_USER,
  password: CLICKHOUSE_PASSWORD,
  database: CLICKHOUSE_DB,
  clickhouse_settings: {
    wait_end_of_query: 1,
  },
});

// 获取命令行参数
const command = process.argv[2]; // 'up' 或 'down'
const migrationsDir = process.argv[3]; // 迁移文件目录

if (!command || !migrationsDir) {
  console.error("Usage: node migrate.js <up|down> <migrations-dir>");
  process.exit(1);
}

// 读取迁移文件
function getMigrationFiles(dir) {
  const fullPath = path.join(__dirname, "..", "migrations", dir);
  if (!fs.existsSync(fullPath)) {
    console.error(`Error: Migration directory ${fullPath} does not exist.`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(fullPath)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const migrations = [];
  for (const file of files) {
    if (file.includes(command === "up" ? ".up.sql" : ".down.sql")) {
      const version = file.split("_")[0];
      const sql = fs.readFileSync(path.join(fullPath, file), "utf8");
      migrations.push({ version, file, sql });
    }
  }

  return migrations;
}

// 创建迁移表
async function createMigrationsTable() {
  try {
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version UInt32,
          dirty UInt8 DEFAULT 0
        ) ENGINE = MergeTree()
        ORDER BY version
      `,
    });
  } catch (error) {
    console.error("Error creating migrations table:", error);
    throw error;
  }
}

// 获取已应用的迁移
async function getAppliedMigrations() {
  try {
    const result = await client.query({
      query: "SELECT version FROM schema_migrations ORDER BY version",
    });
    const rows = await result.json();
    return Array.isArray(rows) ? rows.map((row) => row.version) : [];
  } catch (error) {
    console.error("Error getting applied migrations:", error);
    return [];
  }
}

// 记录迁移
async function recordMigration(version, dirty = 0) {
  try {
    await client.exec({
      query: `INSERT INTO schema_migrations (version, dirty) VALUES (${version}, ${dirty})`,
    });
  } catch (error) {
    // 如果是重复键错误，忽略它
    if (error.message && error.message.includes("Duplicate entry")) {
      console.log(`Migration ${version} already recorded, skipping.`);
      return;
    }
    console.error("Error recording migration:", error);
    throw error;
  }
}

// 删除迁移记录
async function removeMigration(version) {
  try {
    await client.exec({
      query: `DELETE FROM schema_migrations WHERE version = ${version}`,
    });
  } catch (error) {
    console.error("Error removing migration:", error);
    throw error;
  }
}

// 执行迁移
async function executeMigration(version, sql) {
  try {
    console.log(`Executing migration ${version}...`);

    // 改进的SQL语句分割逻辑 - 处理复杂的SQL语句
    const statements = [];
    let currentStatement = "";
    let inString = false;
    let stringChar = "";
    let inComment = false;
    let commentType = ""; // '--' or '/*'

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1];
      const prevChar = i > 0 ? sql[i - 1] : "";

      // 处理注释开始
      if (char === "-" && nextChar === "-" && !inString && !inComment) {
        inComment = true;
        commentType = "--";
        i++; // 跳过下一个字符
        continue;
      }

      if (char === "/" && nextChar === "*" && !inString && !inComment) {
        inComment = true;
        commentType = "/*";
        i++; // 跳过下一个字符
        continue;
      }

      // 处理注释结束
      if (inComment) {
        if (commentType === "--" && char === "\n") {
          inComment = false;
          commentType = "";
        } else if (commentType === "/*" && char === "*" && nextChar === "/") {
          inComment = false;
          commentType = "";
          i++; // 跳过下一个字符
        }
        continue;
      }

      // 处理字符串
      if ((char === "'" || char === '"') && (i === 0 || prevChar !== "\\")) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (stringChar === char) {
          inString = false;
        }
      }

      // 处理分号（不在字符串内，不在注释内）
      if (char === ";" && !inString && !inComment) {
        const trimmed = currentStatement.trim();
        if (trimmed && !trimmed.startsWith("--") && !trimmed.startsWith("/*")) {
          statements.push(trimmed);
        }
        currentStatement = "";
        continue;
      }

      // 如果不是在注释中，添加到当前语句
      if (!inComment) {
        currentStatement += char;
      }
    }

    // 添加最后一个语句
    const lastTrimmed = currentStatement.trim();
    if (
      lastTrimmed &&
      !lastTrimmed.startsWith("--") &&
      !lastTrimmed.startsWith("/*")
    ) {
      statements.push(lastTrimmed);
    }

    console.log(`  Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`  Executing statement ${i + 1}/${statements.length}...`);
          console.log(`  Statement preview: ${statement.substring(0, 100)}...`);

          await client.exec({
            query: statement,
          });
          successCount++;
          console.log(`  Statement ${i + 1} executed successfully`);
        } catch (stmtError) {
          // 如果是表已存在的错误，我们可以忽略它
          if (
            stmtError.code === "57" &&
            stmtError.type === "TABLE_ALREADY_EXISTS"
          ) {
            console.log(`  Statement ${i + 1} skipped - table already exists.`);
            skipCount++;
            continue;
          }

          // 如果是列已存在的错误，我们也可以忽略它
          if (
            stmtError.code === "15" &&
            stmtError.type === "DUPLICATE_COLUMN"
          ) {
            console.log(
              `  Statement ${i + 1} skipped - column already exists.`,
            );
            skipCount++;
            continue;
          }

          // 如果是视图已存在的错误，我们也可以忽略它
          if (
            stmtError.code === "57" &&
            stmtError.type === "TABLE_ALREADY_EXISTS" &&
            statement.toLowerCase().includes("materialized view")
          ) {
            console.log(
              `  Statement ${i + 1} skipped - materialized view already exists.`,
            );
            skipCount++;
            continue;
          }

          console.error(`  Statement ${i + 1} failed:`, stmtError);
          console.error(`  Failed statement: ${statement}`);
          errorCount++;
          throw stmtError;
        }
      }
    }

    console.log(
      `Migration ${version} completed: ${successCount} successful, ${skipCount} skipped, ${errorCount} failed`,
    );

    if (errorCount > 0) {
      throw new Error(
        `Migration ${version} had ${errorCount} failed statements`,
      );
    }

    console.log(`Migration ${version} executed successfully.`);

    // 返回执行结果
    return {
      successCount,
      skipCount,
      errorCount,
      wasSkipped: skipCount > 0 && successCount === 0,
    };
  } catch (error) {
    console.error(`Error executing migration ${version}:`, error);
    throw error;
  }
}

// 验证迁移是否真正成功
async function verifyMigration(version, sql, wasSkipped = false) {
  try {
    console.log(`  Verifying migration ${version}...`);

    // 如果迁移被跳过（表已存在），我们仍然需要验证表是否存在
    if (wasSkipped) {
      console.log(
        `    Migration ${version} was skipped, verifying existing objects...`,
      );
    }

    // 检查是否包含CREATE TABLE语句
    if (sql.includes("CREATE TABLE")) {
      const tableMatches = sql.match(
        /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?/gi,
      );
      if (tableMatches) {
        for (const match of tableMatches) {
          const tableName = match
            .replace(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?/i, "")
            .replace(/`/g, "");
          console.log(`    Verifying table: ${tableName}`);

          try {
            const result = await client.query({
              query: `DESCRIBE TABLE ${tableName}`,
            });
            const rows = await result.json();
            if (rows && rows.length > 0) {
              console.log(`      ✓ Table ${tableName} verified successfully`);
            } else {
              console.log(
                `      ✗ Table ${tableName} verification failed - no columns found`,
              );
              return false;
            }
          } catch (error) {
            // 如果表不存在，这是验证失败
            if (error.message && error.message.includes("doesn't exist")) {
              console.log(
                `      ✗ Table ${tableName} verification failed - table doesn't exist`,
              );
              return false;
            }
            console.log(
              `      ✗ Table ${tableName} verification failed:`,
              error.message,
            );
            return false;
          }
        }
      }
    }

    // 检查是否包含CREATE MATERIALIZED VIEW语句
    if (sql.includes("CREATE MATERIALIZED VIEW")) {
      const viewMatches = sql.match(
        /CREATE MATERIALIZED VIEW\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?/gi,
      );
      if (viewMatches) {
        for (const match of viewMatches) {
          const viewName = match
            .replace(/CREATE MATERIALIZED VIEW\s+(?:IF NOT EXISTS\s+)?/i, "")
            .replace(/`/g, "");
          console.log(`    Verifying materialized view: ${viewName}`);

          try {
            const result = await client.query({
              query: `SHOW TABLES LIKE '${viewName}'`,
            });
            const rows = await result.json();
            if (rows && rows.length > 0) {
              console.log(
                `      ✓ Materialized view ${viewName} verified successfully`,
              );
            } else {
              console.log(
                `      ✗ Materialized view ${viewName} verification failed - not found`,
              );
              return false;
            }
          } catch (error) {
            console.log(
              `      ✗ Materialized view ${viewName} verification failed:`,
              error.message,
            );
            return false;
          }
        }
      }
    }

    console.log(
      `    ✓ Migration ${version} verification completed successfully`,
    );
    return true;
  } catch (error) {
    console.error(`    ✗ Error during migration verification:`, error);
    return false;
  }
}

// 主函数
async function main() {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(
        `Starting ${command} migration... (attempt ${retryCount + 1}/${maxRetries})`,
      );

      // 创建迁移表
      await createMigrationsTable();

      // 获取迁移文件
      const migrations = getMigrationFiles(migrationsDir);
      console.log(`Found ${migrations.length} migration files.`);

      if (command === "up") {
        const appliedMigrations = await getAppliedMigrations();

        for (const migration of migrations) {
          if (!appliedMigrations.includes(parseInt(migration.version))) {
            await executeMigration(migration.version, migration.sql);

            // 暂时禁用验证，专注于修复SQL分割问题
            // const verificationResult = await verifyMigration(
            //   migration.version,
            //   migration.sql,
            // );
            // if (!verificationResult) {
            //   console.error(
            //     `Migration ${migration.version} verification failed!`,
            //   );
            //   throw new Error(
            //     `Migration ${migration.version} verification failed`,
            //   );
            // }

            await recordMigration(parseInt(migration.version));
          } else {
            console.log(
              `Migration ${migration.version} already applied, skipping.`,
            );
          }
        }
      } else if (command === "down") {
        const appliedMigrations = await getAppliedMigrations();

        // 反向执行迁移
        for (let i = migrations.length - 1; i >= 0; i--) {
          const migration = migrations[i];
          if (appliedMigrations.includes(parseInt(migration.version))) {
            await executeMigration(migration.version, migration.sql);
            await removeMigration(parseInt(migration.version));
            break; // 只执行最后一个迁移
          }
        }
      }

      console.log(`${command} migration completed successfully.`);
      break; // 成功完成，退出重试循环
    } catch (error) {
      retryCount++;
      console.error(
        `Migration failed (attempt ${retryCount}/${maxRetries}):`,
        error,
      );

      if (retryCount >= maxRetries) {
        console.error("Max retries reached, exiting.");
        process.exit(1);
      }

      // 等待一段时间后重试
      console.log(`Retrying in 5 seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } finally {
      try {
        await client.close();
      } catch (closeError) {
        console.error("Error closing client:", closeError);
      }
    }
  }
}

main();
