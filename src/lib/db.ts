import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getDbPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 3306,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
      charset: 'utf8mb4',
    });
    // Ensure UTF-8 for Vietnamese at session level
    // Fire-and-forget; subsequent queries will use these session settings
    pool.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci").catch(() => {});
    pool.query("SET SESSION collation_connection = 'utf8mb4_unicode_ci'").catch(() => {});
  }
  return pool;
}

export type Db = ReturnType<typeof getDbPool>;


