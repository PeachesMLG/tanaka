import { pool } from './database';
import { ResultSetHeader } from 'mysql2/promise';

export async function initialiseSettingsDatabase(): Promise<void> {
  const connection = await pool.getConnection();
  await connection.query(`
    CREATE TABLE IF NOT EXISTS Settings
    (
      ID          VARCHAR(255),
      SettingName VARCHAR(255),
      Value       VARCHAR(255),
      PRIMARY KEY (ID, SettingName)
    );
  `);
}

export async function saveSetting(
  id: string,
  settingName: string,
  value: string,
) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO Settings (ID, SettingName, Value)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE Value = VALUES(Value);
      `,
      [id, settingName, value],
    );

    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    console.error('Error saving user setting:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function getSetting(
  id: string,
  settingName: string,
): Promise<string | undefined> {
  try {
    const query = `
      SELECT Value FROM Settings
      WHERE ID = ? AND SettingName = ?;
    `;

    const [rows] = await pool.query(query, [id, settingName]);

    const values = rows as { Value: string }[];

    console.log('Returened', values);
    console.log('Queried', [id, settingName]);

    return values.length > 0 ? values[0].Value : undefined;
  } catch (error) {
    console.error('Error getting user setting:', error);
    return undefined;
  }
}
