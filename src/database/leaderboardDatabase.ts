import { pool } from './database';
import { ResultSetHeader } from 'mysql2/promise';
import { LeaderboardType } from '../types/leaderboardType';

export async function initialiseLeaderboardDatabase(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Leaderboard
      (
        UserId VARCHAR(255),
        Type   VARCHAR(255),
        Amount BIGINT DEFAULT 0,
        PRIMARY KEY (UserId, Type)
      );
    `);
  } finally {
    connection.release();
  }
}

export async function incrementLeaderboard(
  userId: string,
  type: LeaderboardType,
  amount: number = 1,
): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `
        INSERT INTO Leaderboard (UserId, Type, Amount)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE Amount = Amount + VALUES(Amount);
      `,
      [userId, type, amount],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Error incrementing leaderboard:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function getTopLeaderboard(
  type: LeaderboardType,
  limit: number = 10,
): Promise<{ UserId: string; Amount: number }[]> {
  try {
    const query = `
      SELECT UserId, Amount FROM Leaderboard
      WHERE Type = ?
      ORDER BY Amount DESC
      LIMIT ?;
    `;

    const [rows] = await pool.query(query, [type, limit]);

    return rows as { UserId: string; Amount: number }[];
  } catch (error) {
    console.error('Error getting top leaderboard:', error);
    return [];
  }
}

export async function getUserLeaderboardPosition(
  userId: string,
  type: LeaderboardType,
): Promise<{ position: number; amount: number } | null> {
  try {
    const query = `
      SELECT 
        (SELECT COUNT(*) + 1 FROM Leaderboard WHERE Type = ? AND Amount > l.Amount) as position,
        l.Amount as amount
      FROM Leaderboard l
      WHERE l.UserId = ? AND l.Type = ?;
    `;

    const [rows] = await pool.query(query, [type, userId, type]);
    const results = rows as { position: number; amount: number }[];

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error getting user leaderboard position:', error);
    return null;
  }
}