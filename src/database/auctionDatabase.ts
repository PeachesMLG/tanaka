import { pool } from './database';
import { Auction, AuctionStatus } from '../types/auction';

export async function initialiseAuctionDatabase(): Promise<void> {
  const connection = await pool.getConnection();
  await connection.query(`
    CREATE TABLE IF NOT EXISTS Auctions
    (
      ID       INT AUTO_INCREMENT PRIMARY KEY,
      ServerId VARCHAR(255),
      UserID   VARCHAR(255),
      CardId   VARCHAR(255),
      Version  VARCHAR(255),
      Status   VARCHAR(255),
      DateTime DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function saveAuction(auction: Auction): Promise<number> {
  const connection = await pool.getConnection();
  try {
    const query = `
      INSERT INTO Auctions (ServerId, UserID, CardId, Version, Status)
      VALUES (?, ?, ?, ?, ?);
    `;
    const values = [
      auction.ServerId,
      auction.UserId,
      auction.CardId,
      auction.Version,
      auction.Status,
    ];
    const [result]: any = await connection.query(query, values);
    return result.insertId;
  } finally {
    connection.release();
  }
}

export async function getAuctions(
  serverId: string,
  userId: string,
  status: AuctionStatus,
): Promise<Auction[]> {
  const connection = await pool.getConnection();
  try {
    const query = `
      SELECT *
      FROM Auctions
      WHERE ServerId = ? ${userId ? 'AND UserID = ?' : ''} ${status ? 'AND Status = ?' : ''} AND Status != 'DONE'
      ORDER BY DateTime
      DESC;
    `;

    const params = [serverId, userId, status].filter((param) => param);
    const [rows] = await connection.query(query, params);

    return (rows as any[]).map((row) => ({
      ID: row.ID,
      ServerId: row.ServerId,
      UserId: row.UserID,
      CardId: row.CardId,
      Version: row.Version,
      Status: row.Status as AuctionStatus,
      DateTime: new Date(row.DateTime),
    }));
  } finally {
    connection.release();
  }
}
