import { resolve } from 'node:path';

process.loadEnvFile(resolve(__dirname, '../.env.test'));
