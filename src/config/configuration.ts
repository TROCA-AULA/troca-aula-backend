export const config = () => ({
  port: parseInt(process?.env?.PORT ?? '3000', 10),
  logger: process?.env?.PORT?.toUpperCase() === 'TRUE',
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process?.env?.DATABASE_PORT ?? '5432', 10),
  },
  saltRounds: parseInt(process?.env?.SALT ?? '10', 10),
  secret: process?.env?.SECRET ?? 's0//P4$$w0rD',
  // Notificações por e-mail (opcional): sem SMTP_HOST, o EmailService
  // vira no-op e nada quebra em dev/CI.
  smtp: {
    host: process?.env?.SMTP_HOST,
    port: parseInt(process?.env?.SMTP_PORT ?? '587', 10),
    secure: process?.env?.SMTP_SECURE === 'true',
    user: process?.env?.SMTP_USER,
    pass: process?.env?.SMTP_PASS,
    from: process?.env?.SMTP_FROM,
  },
});
