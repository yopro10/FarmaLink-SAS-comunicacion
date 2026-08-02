import pg from 'pg';

const { Pool } = pg;

class Database {
  private static instance: Database;
  private pool: pg.Pool | null = null;
  private connected: boolean = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.connected) {
      console.log('PostgreSQL ya conectado');
      return;
    }

    const dbConfig: pg.PoolConfig = {};
    
    if (process.env.DATABASE_URL) {
      const connectionString = process.env.DATABASE_URL;
      Object.assign(dbConfig, {
        connectionString,
        ssl: {
          rejectUnauthorized: false,
        },
      });
    } else {
      Object.assign(dbConfig, {
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
        ssl: {
          rejectUnauthorized: false,
        },
      });
    }

    this.pool = new Pool(dbConfig);

    try {
      const client = await this.pool.connect();
      client.release();
      this.connected = true;
      console.log('PostgreSQL conectado exitosamente');
    } catch (error) {
      console.error('Error conectando a PostgreSQL:', error);
      throw error;
    }
  }

  public getPool(): pg.Pool {
    if (!this.pool) {
      throw new Error('Database not initialized. Call connect() first.');
    }
    return this.pool;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async disconnect(): Promise<void> {
    if (!this.pool || !this.connected) return;
    await this.pool.end();
    this.connected = false;
    console.log('PostgreSQL desconectado');
  }
}

export default Database;
