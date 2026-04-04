import { config } from './configuration';

describe('configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default configuration', () => {
    delete process.env.PORT;
    delete process.env.DATABASE_HOST;
    delete process.env.DATABASE_PORT;
    delete process.env.SALT;
    delete process.env.SECRET;

    const conf = config();
    expect(conf.port).toBe(3000);
    expect(conf.database.port).toBe(5432);
    expect(conf.saltRounds).toBe(10);
    expect(conf.secret).toBe('s0//P4$$w0rD');
  });

  it('should return configuration from environment variables', () => {
    process.env.PORT = '4000';
    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_PORT = '5433';
    process.env.SALT = '12';
    process.env.SECRET = 'mysecret';

    const conf = config();
    expect(conf.port).toBe(4000);
    expect(conf.database.host).toBe('localhost');
    expect(conf.database.port).toBe(5433);
    expect(conf.saltRounds).toBe(12);
    expect(conf.secret).toBe('mysecret');
  });

  it('should set logger to true if PORT is "TRUE" (based on current implementation)', () => {
    process.env.PORT = 'TRUE';
    const conf = config();
    expect(conf.logger).toBe(true);
  });
});
