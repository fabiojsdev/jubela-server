import * as dotenv from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';

dotenv.config();

const isDevelopment = process.env.NODE_ENV !== 'production';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: +process.env.DATABASE_PORT,
  username: process.env.DATABASE_USERNAME,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  entities: isDevelopment
    ? [join(__dirname, 'src/**/*.entity.ts')]
    : [join(__dirname, 'dist/**/*.entity.js')],

  migrations: isDevelopment
    ? [join(__dirname, 'migrations/*.ts')]
    : [join(__dirname, 'dist/migrations/*.js')],

  synchronize: false,
  logging: true,
});
