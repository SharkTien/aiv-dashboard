import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getDbPool() {
  if (!pool) {
    const useSsl = String(process.env.DATABASE_SSL || "false").toLowerCase() === "true";

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
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    });
    // Ensure UTF-8 for Vietnamese at session level
    pool.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci").catch(() => {});
    pool.query("SET SESSION collation_connection = 'utf8mb4_unicode_ci'").catch(() => {});
    
    // Configure MySQL to avoid temp files globally
    pool.query("SET SESSION tmp_table_size = 1024*1024*1024").catch(() => {}); // 1GB - force in-memory
    pool.query("SET SESSION max_heap_table_size = 1024*1024*1024").catch(() => {}); // 1GB - force in-memory
    pool.query("SET SESSION sort_buffer_size = 16*1024*1024").catch(() => {}); // 16MB
    pool.query("SET SESSION join_buffer_size = 8*1024*1024").catch(() => {}); // 8MB
    pool.query("SET SESSION read_buffer_size = 2*1024*1024").catch(() => {}); // 2MB
    pool.query("SET SESSION read_rnd_buffer_size = 4*1024*1024").catch(() => {}); // 4MB
    
    // Optional connectivity check (non-blocking)
    pool.query("SELECT 1").catch((e) => {
      console.error("[DB] Connectivity error:", e?.message || e);
    });
  }
  return pool;
}

export type Db = ReturnType<typeof getDbPool>;


