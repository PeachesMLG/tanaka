import mysql, { Pool } from 'mysql2/promise';
import { CardClaim, CardDespawn, CardSpawn } from './types/websocketMessage';
import { RecentClaim } from './types/recentClaim';
import { LeaderboardEntry } from './types/leaderboardEntry';

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
                ClaimedVersion Int NULL,
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
            INSERT INTO Spawns (ServerId, ChannelId, BatchId, DateTime, ClaimedCard, ClaimedVersion, UserClaimed, Status)
            VALUES (?, ?, ?, NOW(), ?, ?, ?, ?);
        `,
      [
        cardSpawn.serverId,
        cardSpawn.channelId,
        cardSpawn.batchId,
        null,
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
            SET Status = 'claimed', ClaimedCard = ?, ClaimedVersion = ?, UserClaimed = ?
            WHERE BatchId = ?;
        `,
      [
        cardClaim.card.id,
        cardClaim.cardVersion,
        cardClaim.userId,
        cardClaim.batchId,
      ],
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

export async function getRecentSpawns(
  channelId: string,
  tier?: string,
  maxVersion?: number,
): Promise<RecentClaim[]> {
  try {
    const query = `
      SELECT
          spawn.ServerId as serverId,
          spawn.ChannelId as channelId,
          spawn.BatchId as batchId,
          spawn.DateTime as dateTime,
          JSON_OBJECT(
              'id', claimedCard.Id,
              'type', claimedCard.Type,
              'tier', claimedCard.Tier,
              'name', claimedCard.Name,
              'series', claimedCard.Series
          ) AS claimedCard,
          spawn.UserClaimed as userClaimed,
          spawn.ClaimedVersion as claimedVersion,
          spawn.Status as status,
          CONCAT('[', GROUP_CONCAT(
                  JSON_OBJECT(
                          'id', card.Id,
                          'type', card.Type,
                          'tier', card.Tier,
                          'name', card.Name,
                          'series', card.Series
                  )
              ), ']') AS cards
      FROM
          Spawns spawn
              LEFT JOIN Claims claim ON spawn.BatchId = claim.BatchId
              LEFT JOIN Cards claimedCard ON spawn.ClaimedCard = claimedCard.Id
              LEFT JOIN Cards card ON claim.CardId = card.Id
      WHERE
          spawn.ChannelId = ?
          ${tier ? 'AND card.Tier = ?' : ''}
          ${maxVersion ? 'AND spawn.ClaimedVersion <= ?' : ''}
      GROUP BY
          spawn.ServerId, spawn.ChannelId, spawn.BatchId, spawn.DateTime, claimedCard.Id, spawn.Status
      ORDER BY
          spawn.DateTime DESC
      LIMIT 10;
    `;

    const params = [channelId, tier, maxVersion].filter((param) => param);
    const [rows] = await pool.query(query, params);

    return rows as RecentClaim[];
  } catch (error) {
    console.error('Error querying cards:', error);
    return [];
  }
}

export async function getSpawnLeaderboard(
  channelId: string,
): Promise<LeaderboardEntry[]> {
  try {
    const query = `
        SELECT
            UserClaimed AS userId,
            COUNT(*) AS count
        FROM
            Spawns
        WHERE
            UserClaimed IS NOT NULL
          AND ServerId = ?
          AND YEAR(DateTime) = YEAR(CURDATE())
          AND MONTH(DateTime) = MONTH(CURDATE())
        GROUP BY UserClaimed
        ORDER BY Count DESC
        LIMIT 10;
    `;

    const params = [channelId];
    const [rows] = await pool.query(query, params);

    return rows as LeaderboardEntry[];
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}
