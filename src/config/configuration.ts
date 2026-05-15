export const config = () => ({
  port: parseInt(process?.env?.PORT ?? '3000', 10),
  logger: process?.env?.PORT?.toUpperCase() === 'TRUE',
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process?.env?.DATABASE_PORT ?? '5432', 10),
  },
  saltRounds: parseInt(process?.env?.SALT ?? '10', 10),
  secret: process?.env?.SECRET ?? 's0//P4$$w0rD',
});
