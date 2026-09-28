import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

// E2E de wiring de verdade (substitui o boilerplate "Hello World"): sobe o
// AppModule inteiro (Fastify, como em produção), com o mesmo ValidationPipe
// global do main.ts, e exercita o que NÃO depende do banco — health, guards
// de autenticação e validação de DTO. O banco não é tocado: as rotas
// testadas ou são públicas, ou param no guard/pipe antes de qualquer query.
// (Fluxos que dependem de dados continuam validados manualmente contra
// Postgres real, como documentado no Design Doc.)
describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // DrizzleService só monta a URL de conexão no onModuleInit; nenhuma
    // query é feita nos casos abaixo, então um valor sintático basta.
    process.env.DATABASE_URL ??=
      'postgres://user:pass@localhost:5432/troca_aula_e2e_unused';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / responde Hello World!', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
  });

  it('GET /health responde ok sem tocar no banco', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /users sem token responde 401 (AuthGuard)', () => {
    return request(app.getHttpServer()).get('/users').expect(401);
  });

  it('GET /classes sem token responde 401 (AuthGuard)', () => {
    return request(app.getHttpServer()).get('/classes').expect(401);
  });

  it('PATCH /auth/change-password sem token responde 401 (AuthGuard)', () => {
    return request(app.getHttpServer())
      .patch('/auth/change-password')
      .send({ currentPassword: 'a', newPassword: 'b' })
      .expect(401);
  });

  it('POST /auth/login sem corpo responde 400 (ValidationPipe global)', () => {
    return request(app.getHttpServer()).post('/auth/login').send({}).expect(400);
  });

  it('PATCH /auth/change-password com token inválido responde 401', () => {
    return request(app.getHttpServer())
      .patch('/auth/change-password')
      .set('Authorization', 'Bearer token-invalido')
      .send({ currentPassword: 'senha-atual', newPassword: 'senha-nova-123' })
      .expect(401);
  });
});
