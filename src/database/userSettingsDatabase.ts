import { pool } from './database';
import { ResultSetHeader } from 'mysql2/promise';

export async function initialiseUserSettingsDatabase(): Promise<void> {
  const connection = await pool.getConnection();
  await connection.query(`
    CREATE TABLE IF NOT EXISTS UserSettings
    (
      UserID      VARCHAR(255),
      SettingName VARCHAR(255),
      Value       BOOLEAN,
      PRIMARY KEY (UserID, SettingName)
    );
  `);
}

export async function saveUserSetting(
  userId: string,
  settingName: string,
  value: boolean,
) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query<ResultSetHeader>(
      `
        INSERT INTO UserSettings (UserID, SettingName, Value)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE Value = VALUES(Value);
      `,
      [userId, settingName, value],
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

export async function getUserSetting(
  userId: string,
  settingName: string,
): Promise<boolean | undefined> {
  try {
    const query = `
      SELECT Value FROM UserSettings
      WHERE UserID = ? AND SettingName = ?;
    `;

    const [rows] = await pool.query(query, [userId, settingName]);

    const values = rows as { Value: boolean }[];

    return values.length > 0 ? values[0].Value : undefined;
  } catch (error) {
    console.error('Error getting user setting:', error);
    return undefined;
  }
}
