import mysql, { Pool } from 'mysql2/promise';
import { initialiseTimerDatabase } from './timerDatabase';
import { initialiseRecentClaimsDatabase } from './recentClaimsDatabase';
import { initialiseSettingsDatabase } from './settingsDatabase';
import { initialiseAuctionDatabase } from './auctionDatabase';

export let pool: Pool;

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
    await initialiseTimerDatabase();
    await initialiseRecentClaimsDatabase();
    await initialiseSettingsDatabase();
    await initialiseAuctionDatabase();

    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    connection.release();
  }
}
