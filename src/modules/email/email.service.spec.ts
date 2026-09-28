import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('EmailService', () => {
  const sendMail = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
  });

  async function build(env: Record<string, unknown>) {
    const config = {
      get: jest.fn((key: string) => env[key]),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService, { provide: ConfigService, useValue: config }],
    }).compile();
    return module.get(EmailService);
  }

  it('sem SMTP configurado, é no-op (não cria transporte nem envia)', async () => {
    const service = await build({});

    expect(service.enabled).toBe(false);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();

    await service.send({ to: 'a@b.com', subject: 'x', text: 'y' });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('com SMTP configurado, envia com o from e os dados da mensagem', async () => {
    const service = await build({
      'smtp.host': 'smtp.exemplo.com',
      'smtp.port': 587,
      'smtp.user': 'user',
      'smtp.pass': 'pass',
      'smtp.from': 'Troca Aula <no-reply@exemplo.com>',
    });

    expect(service.enabled).toBe(true);
    await service.send({
      to: 'maria@escola.com',
      subject: 'Aprovada',
      text: 'ok',
    });

    expect(sendMail).toHaveBeenCalledWith({
      from: 'Troca Aula <no-reply@exemplo.com>',
      to: 'maria@escola.com',
      subject: 'Aprovada',
      text: 'ok',
    });
  });

  it('nunca propaga falha de envio', async () => {
    const service = await build({ 'smtp.host': 'smtp.exemplo.com' });
    sendMail.mockRejectedValueOnce(new Error('smtp fora do ar'));

    await expect(
      service.send({ to: 'a@b.com', subject: 'x', text: 'y' }),
    ).resolves.toBeUndefined();
  });
});
