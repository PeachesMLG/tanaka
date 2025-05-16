import mysql, { Pool, ResultSetHeader } from 'mysql2/promise';
import { TimerEntry } from './types/timerEntry';

let pool: Pool;

export async function initialiseDatabase(): Promise<void> {
  pool = mysql.createPool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USERNAME,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const connection = await pool.getConnection();
  try {
    await connection.query(`
            CREATE TABLE IF NOT EXISTS Timer (
                ID INT AUTO_INCREMENT PRIMARY KEY,
                UserID VARCHAR(255),
                ChannelID VARCHAR(255),
                Reason TEXT,
                Time INT,
                Information TEXT
            );
        `);

    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function saveTimer(
  userId: string,
  channelId: string,
  reason: string,
  timestamp: number,
  information: string,
) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query<ResultSetHeader>(
      `
          INSERT INTO Timer (UserID, ChannelID, Reason, Time, Information) VALUES (?, ?, ?, ?, ?);
        `,
      [userId, channelId, reason, timestamp, information],
    );

    await connection.commit();
    return rows.insertId;
  } catch (error) {
    await connection.rollback();
    console.error('Error saving timer:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteTimer(Id: number) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `
          DELETE FROM Timer where ID = ?;
      `,
      [Id],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting timer:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function getTimers() {
  try {
    const query = `
        SELECT * FROM Timer;
    `;

    const [rows] = await pool.query(query);

    return rows as TimerEntry[];
  } catch (error) {
    console.error('Error getting timers:', error);
    return [];
  }
}
