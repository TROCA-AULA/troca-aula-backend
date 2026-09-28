import { AppModule } from './app.module';

// Smoke de wiring: importar o AppModule avalia todos os @Module/controllers/
// providers dos módulos importados, mas nada abre conexão no import (o
// DrizzleService só conecta no onModuleInit do ciclo de vida do Nest), então
// não é preciso subir um TestingModule nem configurar env aqui.
describe('AppModule (smoke de wiring)', () => {
  it('é definido', () => {
    expect(AppModule).toBeDefined();
  });

  it('registra os metadados do @Module', () => {
    const metadataKeys = Reflect.getMetadataKeys(AppModule);
    expect(metadataKeys).toEqual(
      expect.arrayContaining(['imports', 'controllers', 'providers']),
    );
    expect(Reflect.getMetadata('imports', AppModule)).toBeDefined();
    expect(Reflect.getMetadata('controllers', AppModule)).toBeDefined();
    expect(Reflect.getMetadata('providers', AppModule)).toBeDefined();
  });
});
