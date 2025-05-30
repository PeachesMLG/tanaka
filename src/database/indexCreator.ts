import { pool } from './database';

export async function createIndexs(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    const [existingIndexes] = await connection.query(
      `SHOW INDEXES FROM RecentClaims`,
    );
    const existingIndexNames = new Set(
      (existingIndexes as { Key_name: string }[]).map(
        (index) => index.Key_name,
      ),
    );

    // Index definitions
    const indexes = [
      {
        name: 'idx_serverid_rarity_datetime',
        query: `CREATE INDEX idx_serverid_rarity_datetime ON RecentClaims (ServerId, Rarity, DateTime DESC);`,
      },
      {
        name: 'idx_serverid_version_datetime',
        query: `CREATE INDEX idx_serverid_version_datetime ON RecentClaims (ServerId, Version, DateTime DESC);`,
      },
      {
        name: 'idx_serverid_rarity_version_datetime',
        query: `CREATE INDEX idx_serverid_rarity_version_datetime ON RecentClaims (ServerId, Rarity, Version, DateTime DESC);`,
      },
      {
        name: 'idx_serverid_datetime_userid',
        query: `CREATE INDEX idx_serverid_datetime_userid ON RecentClaims (ServerId, DateTime, UserID);`,
      },
    ];

    for (const index of indexes) {
      if (!existingIndexNames.has(index.name)) {
        try {
          await connection.query(index.query);
          console.log(`Created index: ${index.name}`);
        } catch (error) {
          console.error(`Failed to create index ${index.name}:`, error);
        }
      } else {
        console.log(`Index already exists: ${index.name}`);
      }
    }
  } catch (err) {
    console.error('Error checking/creating indexes:', err);
  } finally {
    connection.release();
  }
}
