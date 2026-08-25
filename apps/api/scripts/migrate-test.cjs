// Applies migrations to the test database (DATABASE_URL from .env.test).
// A plain Node script rather than a shell env-var prefix so it works the
// same way on Windows/PowerShell, cmd.exe, and POSIX shells.
const path = require('node:path');
const { execSync } = require('node:child_process');

process.loadEnvFile(path.resolve(__dirname, '../.env.test'));

execSync('npx prisma migrate deploy --schema prisma/schema.prisma', {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
});
