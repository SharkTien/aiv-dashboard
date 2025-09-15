import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function ensureTables() {
  const pool = getDbPool();
  // feedback table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      status ENUM('open','closed') NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  // feedback_reply table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS feedback_reply (
      id INT AUTO_INCREMENT PRIMARY KEY,
      feedback_id INT NOT NULL,
      author_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (feedback_id),
      CONSTRAINT fk_feedback_reply_feedback FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  // notification table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notification (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      read_flag TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX (user_id),
      INDEX (read_flag)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pool = getDbPool();
  await ensureTables();

  const { searchParams } = new URL(req.url);
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 100);
  const offset = (page - 1) * limit;
  const status = searchParams.get("status");

  const where: string[] = [];
  const params: any[] = [];
  if (user.role !== "admin") {
    where.push("user_id = ?");
    params.push(Number(user.sub));
  }
  if (status && ["open", "closed"].includes(status)) {
    where.push("status = ?");
    params.push(status);
  }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT id, user_id, title, message, status, created_at, updated_at 
     FROM feedback ${whereClause}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM feedback ${whereClause}`,
    params
  );
  const total = Array.isArray(countRows) && countRows.length ? (countRows[0] as any).total : 0;

  return NextResponse.json({
    success: true,
    items: Array.isArray(rows) ? rows : [],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pool = getDbPool();
  await ensureTables();

  const body = await req.json();
  const title = String(body?.title || "").trim();
  const message = String(body?.message || "").trim();
  if (!title || !message) {
    return NextResponse.json({ error: "Missing title or message" }, { status: 400 });
  }

  const [res] = await pool.execute(
    `INSERT INTO feedback (user_id, title, message) VALUES (?, ?, ?)`,
    [user.sub, title, message]
  );
  const insertedId = (res as any).insertId as number;

  // Notify all admins
  const [admins] = await pool.query(`SELECT user_id FROM user WHERE role = 'admin' AND status = 1`);
  const adminIds: number[] = Array.isArray(admins) ? (admins as any[]).map((r) => r.user_id) : [];
  for (const adminId of adminIds) {
    await pool.execute(
      `INSERT INTO notification (user_id, type, title, body) VALUES (?, 'feedback_new', ?, ?)`,
      [adminId, `New feedback: ${title}`, message]
    );
  }

  return NextResponse.json({ success: true, id: insertedId });
}


