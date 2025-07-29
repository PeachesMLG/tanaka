import { pool } from './database';
import { CardClaim } from '../types/cardClaim';
import { ResultSetHeader } from 'mysql2/promise';
import { ClaimCount } from '../types/claimCount';
import { ServerClaimCount } from '../types/serverClaimCount';
import { CardItem } from '../types/cardItem';
import { CardDetails } from '../types/cardDetails';

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
        INSERT INTO RecentClaims (ServerId, UserID, Name, Rarity, Series, Version, UUID, Event)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        cardClaim.ServerId,
        cardClaim.UserID,
        cardClaim.CardItem.Details.CardName,
        cardClaim.CardItem.Details.Rarity,
        cardClaim.CardItem.Details.SeriesName,
        cardClaim.CardItem.Version,
        cardClaim.CardItem.Details.UUID,
        cardClaim.CardItem.Details.EventName,
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

    const a = rows as {
      ServerID: string;
      UserID: string;
      Name: string;
      Rarity: string;
      Series: string;
      Version: number;
      UUID: string;
      Event: string;
      DateTime: Date;
    }[];
    return a.map((value) => {
      return {
        ServerId: value.ServerID,
        UserID: value.UserID,
        DateTime: value.DateTime,
        CardItem: {
          Version: value.Version.toString(),
          Details: {
            CardName: value.Name,
            Rarity: value.Rarity,
            SeriesName: value.Series,
            UUID: value.UUID,
            EventName: value.Event,
          } as CardDetails,
        } as CardItem,
      } as CardClaim;
    });
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

export async function getTopServers(
  startDate: Date,
  endDate: Date,
): Promise<ServerClaimCount[]> {
  try {
    const query = `
      SELECT ServerId, COUNT(*) AS ClaimCount
      FROM RecentClaims
      WHERE DateTime >= ?
        AND DateTime < ?
      GROUP BY ServerId
      ORDER BY ClaimCount DESC
    `;

    const [rows] = await pool.query(query, [startDate, endDate]);
    return (rows as { ServerId: string; ClaimCount: number }[]).map(
      (row, index) =>
        ({
          ...row,
          Rank: index + 1,
        }) as ServerClaimCount,
    );
  } catch (error) {
    console.error('Error getting top claimers:', error);
    return [];
  }
}
