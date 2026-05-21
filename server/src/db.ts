import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

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
        notifications_enabled BOOLEAN DEFAULT TRUE,
        location_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add profile_picture column if it doesn't exist
    await client.query(`
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS profile_picture TEXT;
    `);

    // Add notifications and location preferences if they don't exist
    await client.query(`
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;
    `);
    await client.query(`
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS location_enabled BOOLEAN DEFAULT FALSE;
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

    // Add type + coordinate columns if they don't exist (migration for existing DBs)
    await client.query(`
      ALTER TABLE "ocorrencia" ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'error';
    `);
    await client.query(`
      ALTER TABLE "ocorrencia" ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
    `);
    await client.query(`
      ALTER TABLE "ocorrencia" ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
    `);

    // Create Contatos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "contatos" (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        emergencial BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add emergencial column if it doesn't exist (migration for existing DBs)
    await client.query(`
      ALTER TABLE "contatos" ADD COLUMN IF NOT EXISTS emergencial BOOLEAN DEFAULT FALSE;
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

    const defaultUsers = [
      { name: 'Maria Silva (Teste)', email: 'maria@teste.com', password: 'senha_segura_123' },
      { name: 'Ana Costa (Teste)', email: 'ana@teste.com', password: 'senha_segura_123' },
      { name: 'Julia Alves (Teste)', email: 'julia@teste.com', password: 'senha_segura_123' }
    ];

    for (const user of defaultUsers) {
      const checkUser = await client.query('SELECT id FROM "user" WHERE email = $1', [user.email]);

      if (checkUser.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await client.query(
          'INSERT INTO "user" (name, email, password) VALUES ($1, $2, $3)',
          [user.name, user.email, hashedPassword]
        );
        console.log(`Usuária de teste criada: ${user.name}`);
      }
    }

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
