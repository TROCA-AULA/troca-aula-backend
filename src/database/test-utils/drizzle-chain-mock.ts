// Helper de teste compartilhado: simula a API fluente do Drizzle
// (`db.select().from(t).where(...)`, `db.insert(t).values(...).returning()`
// etc.) para os testes unitários de repository/service que antes mockavam
// `PrismaService` diretamente (ver *.repository.spec.ts, *.service.spec.ts).
// Cada método da cadeia retorna o próprio mock (encadeável) e o mock em si é
// "thenable", então `await db.select().from(t).where(x)` resolve para
// `result` mesmo sem chamar `.returning()`.
export function createDrizzleChainMock<T>(result: T) {
  const chain: any = {
    values: jest.fn(() => chain),
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    set: jest.fn(() => chain),
    onConflictDoUpdate: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    innerJoin: jest.fn(() => chain),
    leftJoin: jest.fn(() => chain),
    orderBy: jest.fn(() => chain),
    returning: jest.fn(() => Promise.resolve(result)),
    then: (onFulfilled: (value: T) => unknown) =>
      Promise.resolve(result).then(onFulfilled),
    catch: (onRejected: (reason: unknown) => unknown) =>
      Promise.resolve(result).catch(onRejected),
  };
  return chain;
}
