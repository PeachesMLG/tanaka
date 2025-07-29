import { pool } from './database';
import { ResultSetHeader } from 'mysql2/promise';

export async function initialiseClanWarDatabase(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ClanWar
      (
        ID         INT AUTO_INCREMENT PRIMARY KEY,
        UserId     VARCHAR(255),
        Clan       VARCHAR(255),
        Type       VARCHAR(255),
        DateTime   DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } finally {
    connection.release();
  }
}

export async function saveClanWarAttack(
  userId: string,
  clan: string,
  type: string,
) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO ClanWar (ID, UserId, Clan, Type)
        VALUES (?, ?, ?);
      `,
      [userId, clan, type],
    );

    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    console.error('Error saving clan war:', error);
    throw error;
  } finally {
    connection.release();
  }
}
