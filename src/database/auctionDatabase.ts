import { pool } from './database';
import { Auction, AuctionStatus } from '../types/auction';

export async function initialiseAuctionDatabase(): Promise<void> {
  const connection = await pool.getConnection();
  await connection.query(`
    CREATE TABLE IF NOT EXISTS Auctions
    (
      ID              INT AUTO_INCREMENT PRIMARY KEY,
      ServerId        VARCHAR(255),
      UserId          VARCHAR(255),
      CardId          VARCHAR(255),
      Version         VARCHAR(255),
      Rarity          VARCHAR(255),
      Series          VARCHAR(255),
      Name            VARCHAR(255),
      ChannelId       VARCHAR(255),
      ThreadId        VARCHAR(255),
      QueueMessageId  VARCHAR(255),
      Status          VARCHAR(255),
      QueueType       VARCHAR(255),
      ImageUrl        VARCHAR(255),
      CreatedDateTime DATETIME DEFAULT CURRENT_TIMESTAMP,
      ExpiresDateTime DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function saveAuction(
  auction: Omit<
    Auction,
    'ID' | 'PositionInQueue' | 'CreatedDateTime' | 'ExpiresDateTime'
  >,
): Promise<number> {
  const connection = await pool.getConnection();
  try {
    const query = `
      INSERT INTO Auctions (ServerId, UserId, CardId, Version, Rarity, Series, Name, ChannelId, ThreadId, QueueMessageId, Status, QueueType, ImageUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
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
      auction.QueueMessageId,
      auction.Status,
      auction.QueueType,
      auction.ImageUrl,
    ];
    const [result]: any = await connection.query(query, values);
    return result.insertId;
  } finally {
    connection.release();
  }
}

export async function updateAuction(
  auction: Partial<Omit<Auction, 'PositionInQueue' | 'CreatedDateTime'>> & {
    ID: number;
  },
): Promise<void> {
  const connection = await pool.getConnection();
  try {
    const fields = Object.keys(auction).filter(
      (key) =>
        key !== 'ID' && auction[key as keyof typeof auction] !== undefined,
    );

    if (fields.length === 0) {
      throw new Error('No fields provided to update.');
    }

    const setClause = fields.map((field) => `${field} = ?`).join(', ');
    const values = fields.map(
      (field) => auction[field as keyof typeof auction],
    );
    values.push(auction.ID);

    const query = `
      UPDATE Auctions
      SET ${setClause}
      WHERE ID = ?;
    `;

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

export async function getAuctionsByState(
  status: AuctionStatus,
  serverId?: string,
  rarity?: string,
): Promise<Auction[]> {
  const query = `
    SELECT * FROM Auctions WHERE Status = ? ${serverId ? 'AND ServerId = ?' : ''} ${rarity ? 'AND Rarity = ?' : ''};
  `;

  const params = [status, serverId, rarity].filter((param) => param);
  const [rows] = await pool.query(query, params);

  return rows as Auction[];
}

export async function getAuctions(
  serverId: string,
  UserId?: string,
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
                 ORDER BY CASE WHEN Status = 'IN_QUEUE' THEN CreatedDateTime END DESC
                 )
               ELSE 0
               END AS PositionInQueue
      FROM Auctions
      WHERE ServerId = ?
        AND Status != 'DONE'
        AND Status != 'REJECTED'
      ORDER BY CreatedDateTime DESC;
    `;

    const params = [serverId, UserId, status].filter((param) => param);
    const [rows] = await connection.query(query, params);

    const auctions = (rows as any[]).map(
      (row) =>
        ({
          ID: row.ID,
          ServerId: row.ServerId,
          UserId: row.UserId,
          CardId: row.CardId,
          Version: row.Version,
          Rarity: row.Rarity,
          Series: row.Series,
          Name: row.Name,
          ChannelId: row.ChannelId,
          ThreadId: row.ThreadId,
          PositionInQueue: row.PositionInQueue,
          Status: row.Status as AuctionStatus,
          CreatedDateTime: new Date(row.CreatedDateTime),
          ExpiresDateTime: new Date(row.ExpiresDateTime),
        }) as Auction,
    );

    return auctions
      .filter((auction) => !UserId || auction.UserId === UserId)
      .filter((auction) => !status || auction.Status === status)
      .filter((auction) => !channelId || auction.ChannelId === channelId);
  } finally {
    connection.release();
  }
}
