import { ResultSetHeader } from 'mysql2/promise';
import { TimerEntry } from '../types/timerEntry';
import { pool } from './database';

export async function initialiseTimerDatabase(): Promise<void> {
  const connection = await pool.getConnection();
  await connection.query(`
    CREATE TABLE IF NOT EXISTS Timer
    (
      ID          INT AUTO_INCREMENT PRIMARY KEY,
      UserID      VARCHAR(255),
      ChannelID   VARCHAR(255),
      Reason      TEXT,
      Time        DATETIME,
      Information TEXT
    );
  `);
}

export async function saveTimer(
  userId: string,
  channelId: string,
  reason: string,
  timestamp: Date,
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
