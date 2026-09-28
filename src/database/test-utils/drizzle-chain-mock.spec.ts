import { createDrizzleChainMock } from './drizzle-chain-mock';

describe('createDrizzleChainMock', () => {
  it('should chain every query builder method', async () => {
    const rows = [{ id: 1 }];
    const chain = createDrizzleChainMock(rows);

    expect(chain.values()).toBe(chain);
    expect(chain.from()).toBe(chain);
    expect(chain.where()).toBe(chain);
    expect(chain.set()).toBe(chain);
    expect(chain.onConflictDoUpdate()).toBe(chain);
    expect(chain.limit()).toBe(chain);
    expect(chain.innerJoin()).toBe(chain);
    expect(chain.leftJoin()).toBe(chain);
    expect(chain.orderBy()).toBe(chain);

    await expect(chain.returning()).resolves.toBe(rows);
  });

  it('should be thenable and resolve to the provided result', async () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const chain = createDrizzleChainMock(rows);

    await expect(chain).resolves.toBe(rows);
    await expect(chain.then((value) => value.length)).resolves.toBe(2);
  });

  it('should not call the catch handler when there is no rejection', async () => {
    const rows = [{ id: 1 }];
    const chain = createDrizzleChainMock(rows);
    const handler = jest.fn();

    await expect(chain.catch(handler)).resolves.toBe(rows);
    expect(handler).not.toHaveBeenCalled();
  });

  it('should propagate rejections through then/catch', async () => {
    const error = new Error('db unavailable');
    const chain = createDrizzleChainMock(Promise.reject(error));
    const onRejected = jest.fn((reason: unknown) => reason);

    await expect(chain.catch(onRejected)).resolves.toBe(error);
    expect(onRejected).toHaveBeenCalledWith(error);
    // O `then` do helper só encaminha onFulfilled; a promise devolvida é que
    // carrega a rejeição (o thenable em si não repassa onRejected).
    await expect(chain.then(() => 'never')).rejects.toThrow('db unavailable');
  });
});
