import { pool } from './database';
import { Auction, AuctionStatus } from '../types/auction';
import { TimerEntry } from '../types/timerEntry';

export async function initialiseAuctionDatabase(): Promise<void> {
  const connection = await pool.getConnection();
  await connection.query(`
    CREATE TABLE IF NOT EXISTS Auctions
    (
      ID        INT AUTO_INCREMENT PRIMARY KEY,
      ServerId  VARCHAR(255),
      UserID    VARCHAR(255),
      CardId    VARCHAR(255),
      Version   VARCHAR(255),
      Rarity    VARCHAR(255),
      Series    VARCHAR(255),
      Name      VARCHAR(255),
      ChannelId VARCHAR(255),
      ThreadId  VARCHAR(255),
      Status    VARCHAR(255),
      DateTime  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function saveAuction(auction: Auction): Promise<number> {
  const connection = await pool.getConnection();
  try {
    const query = `
      INSERT INTO Auctions (ServerId, UserID, CardId, Version, Rarity, Series, Name, ChannelId, ThreadId, Status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const values = [
      auction.ServerId,
      auction.UserId,
      auction.CardId,
      auction.Version,
      auction.Rarity,
      auction.Series,
      auction.Name,
      auction.ChannelId,
      auction.ThreadId,
      auction.Status,
    ];
    const [result]: any = await connection.query(query, values);
    return result.insertId;
  } finally {
    connection.release();
  }
}

export async function setAuctionState(
  id: number,
  state: AuctionStatus,
): Promise<void> {
  const connection = await pool.getConnection();
  try {
    const query = `
      UPDATE Auctions
      SET Status = ?
      WHERE Id = ?;
    `;
    const values = [state, id];
    await connection.query(query, values);
  } finally {
    connection.release();
  }
}

export async function setAuctionThread(
  id: number,
  thread: string,
): Promise<void> {
  const connection = await pool.getConnection();
  try {
    const query = `
      UPDATE Auctions
      SET Status = ?
      WHERE ThreadId = ?;
    `;
    const values = [thread, id];
    await connection.query(query, values);
  } finally {
    connection.release();
  }
}

export async function getAuctionById(
  auctionId: number,
): Promise<Auction | undefined> {
  const query = `
        SELECT * FROM Auctions WHERE ID = ?;
    `;

  const [rows] = await pool.query(query, [auctionId]);

  const auctions = rows as Auction[];

  return auctions.length > 0 ? auctions[0] : undefined;
}

export async function getAuctions(
  serverId: string,
  userId?: string,
  channelId?: string,
  status?: AuctionStatus,
): Promise<Auction[]> {
  const connection = await pool.getConnection();
  try {
    const query = `
      SELECT *,
             CASE
               WHEN Status = 'IN_QUEUE'
                 THEN ROW_NUMBER() OVER (
                 PARTITION BY ServerId
                 ORDER BY CASE WHEN Status = 'IN_QUEUE' THEN DateTime END DESC
                 )
               ELSE 0
               END AS PositionInQueue
      FROM Auctions
      WHERE ServerId = ?
        AND Status != 'DONE'
        AND Status != 'REJECTED'
      ORDER BY DateTime DESC;
    `;

    const params = [serverId, userId, status].filter((param) => param);
    const [rows] = await connection.query(query, params);

    const auctions = (rows as any[]).map(
      (row) =>
        ({
          ID: row.ID,
          ServerId: row.ServerId,
          UserId: row.UserID,
          CardId: row.CardId,
          Version: row.Version,
          Rarity: row.Rarity,
          Series: row.Series,
          Name: row.Name,
          ChannelId: row.ChannelId,
          ThreadId: row.ThreadId,
          PositionInQueue: row.PositionInQueue,
          Status: row.Status as AuctionStatus,
          DateTime: new Date(row.DateTime),
        }) as Auction,
    );

    return auctions
      .filter((auction) => !userId || auction.UserId === userId)
      .filter((auction) => !status || auction.Status === status)
      .filter((auction) => !channelId || auction.ChannelId === channelId);
  } finally {
    connection.release();
  }
}
