import mysql, { Pool } from 'mysql2/promise';
import { CardClaim, CardDespawn, CardSpawn } from './types/websocketMessage';

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
            CREATE TABLE IF NOT EXISTS Cards (
                Id VARCHAR(255),
                Type VARCHAR(255),
                Tier VARCHAR(255),
                Name VARCHAR(255),
                Series VARCHAR(255),
                PRIMARY KEY (Id)
            );
        `);

    await connection.query(`
            CREATE TABLE IF NOT EXISTS Spawns (
                ServerId VARCHAR(255),
                ChannelId VARCHAR(255),
                BatchId VARCHAR(255),
                DateTime DATETIME,
                ClaimedCard VARCHAR(255) NULL,
                UserClaimed VARCHAR(255) NULL,
                Status VARCHAR(255),
                PRIMARY KEY (BatchId)
            );
        `);

    await connection.query(`
            CREATE TABLE IF NOT EXISTS Claims (
                BatchId VARCHAR(255),
                ClaimId VARCHAR(255),
                CardId VARCHAR(255),
                PRIMARY KEY (ClaimId),
                FOREIGN KEY (BatchId) REFERENCES Spawns(BatchId),
                FOREIGN KEY (CardId) REFERENCES Cards(Id)
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

export async function saveCardSpawn(cardSpawn: CardSpawn): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `
            INSERT INTO Spawns (ServerId, ChannelId, BatchId, DateTime, ClaimedCard, UserClaimed, Status)
            VALUES (?, ?, ?, NOW(), ?, ?, ?);
        `,
      [
        cardSpawn.serverId,
        cardSpawn.channelId,
        cardSpawn.batchId,
        null,
        null,
        'active',
      ],
    );

    for (const claim of cardSpawn.claims) {
      const card = claim.card;
      await connection.query(
        `
                INSERT INTO Cards (Id, Type, Tier, Name, Series)
                VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY
                UPDATE
                    Type =
                VALUES (Type), Tier =
                VALUES (Tier), Name =
                VALUES (Name), Series =
                VALUES (Series);
            `,
        [card.id, card.type, card.tier, card.name, card.series],
      );

      await connection.query(
        `
                INSERT INTO Claims (BatchId, ClaimId, CardId)
                VALUES (?, ?, ?);
            `,
        [cardSpawn.batchId, claim.claimId, card.id],
      );
    }

    await connection.commit();
    console.log('Card spawn saved successfully.');
  } catch (error) {
    await connection.rollback();
    console.error('Error saving card spawn:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function saveCardDespawn(cardDespawn: CardDespawn): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `
            UPDATE Spawns
            SET Status = 'despawned'
            WHERE BatchId = ?;
        `,
      [cardDespawn.batchId],
    );

    await connection.commit();
    console.log(`Card despawn saved for BatchId: ${cardDespawn.batchId}`);
  } catch (error) {
    await connection.rollback();
    console.error('Error saving card despawn:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function saveCardClaim(cardClaim: CardClaim): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `
            UPDATE Spawns
            SET Status = 'claimed', ClaimedCard = ?, UserClaimed = ?
            WHERE BatchId = ?;
        `,
      [cardClaim.card.id, cardClaim.userId, cardClaim.batchId],
    );

    await connection.commit();
    console.log(
      `Card claim saved successfully for BatchId: ${cardClaim.batchId}, ClaimId: ${cardClaim.claimId}`,
    );
  } catch (error) {
    await connection.rollback();
    console.error('Error saving card claim:', error);
    throw error;
  } finally {
    connection.release();
  }
}
