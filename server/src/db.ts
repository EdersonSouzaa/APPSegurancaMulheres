import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create User table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Ocorrencia table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ocorrencia" (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pendente',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Contatos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "contatos" (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create SOS table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "SOS" (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('Database tables initialized successfully');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error initializing database tables:', e);
    throw e;
  } finally {
    client.release();
  }
};

export default pool;
