import { pool } from './database';
import { CardClaim } from '../types/cardClaim';
import { ResultSetHeader } from 'mysql2/promise';
import { ClaimCount } from '../types/claimCount';

export async function initialiseRecentClaimsDatabase(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS RecentClaims
      (
        ID       INT AUTO_INCREMENT PRIMARY KEY,
        ServerId VARCHAR(255),
        UserID   VARCHAR(255),
        Name     VARCHAR(255),
        Rarity   VARCHAR(255),
        Series   VARCHAR(255),
        Version  INTEGER,
        DateTime DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } finally {
    connection.release();
  }
}

export async function saveClaim(cardClaim: CardClaim) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO RecentClaims (ServerId, UserID, Name, Rarity, Series, Version)
        VALUES (?, ?, ?, ?, ?, ?);
      `,
      [
        cardClaim.ServerId,
        cardClaim.UserID,
        cardClaim.Name,
        cardClaim.Rarity,
        cardClaim.Series,
        cardClaim.Version,
      ],
    );

    await connection.commit();
    return rows.insertId;
  } catch (error) {
    await connection.rollback();
    console.error('Error saving card claim:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function getRecentClaims(
  serverId: string,
  rarity?: string,
  maxVersion?: number,
): Promise<CardClaim[]> {
  try {
    const query = `
      SELECT *
      FROM RecentClaims
      WHERE ServerId = ? ${rarity ? 'AND Rarity = ?' : ''} ${maxVersion ? 'AND Version <= ?' : ''}
      ORDER BY DateTime
      DESC
        LIMIT 10;
    `;

    const params = [serverId, rarity, maxVersion].filter((param) => param);
    const [rows] = await pool.query(query, params);

    return rows as CardClaim[];
  } catch (error) {
    console.error('Error querying cards:', error);
    return [];
  }
}

export async function getTopClaimers(
  serverId: string,
  startDate: Date,
  endDate: Date,
): Promise<ClaimCount[]> {
  console.log(
    'Getting top claimers by ',
    startDate.toDateString(),
    ' - ',
    endDate.toDateString(),
  );

  try {
    const query = `
      SELECT UserID, COUNT(*) AS ClaimCount
      FROM RecentClaims
      WHERE ServerId = ?
        AND DateTime >= ?
        AND DateTime < ?
      GROUP BY UserID
      ORDER BY ClaimCount DESC
    `;

    const [rows] = await pool.query(query, [serverId, startDate, endDate]);
    return (rows as { UserID: string; ClaimCount: number }[]).map(
      (row, index) =>
        ({
          ...row,
          Rank: index + 1,
        }) as ClaimCount,
    );
  } catch (error) {
    console.error('Error getting top claimers:', error);
    return [];
  }
}
