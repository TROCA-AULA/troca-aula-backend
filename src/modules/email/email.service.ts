import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

// Notificações por e-mail (pendência do roadmap). Sem SMTP configurado
// (SMTP_HOST ausente), o serviço vira um no-op que só registra em log — o
// projeto não tem infraestrutura de e-mail própria, então nada quebra em
// dev/CI, e produção liga só com as variáveis de ambiente.
//
// Nunca lança para o chamador: e-mail é um extra, não pode derrubar a
// operação de negócio (aprovar candidatura, criar vaga).
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('smtp.host');
    this.from =
      this.config.get<string>('smtp.from') ??
      'Troca Aula <nao-responder@trocaaula.local>';

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('smtp.port') ?? 587,
        secure: this.config.get<boolean>('smtp.secure') ?? false,
        auth: this.config.get<string>('smtp.user')
          ? {
              user: this.config.get<string>('smtp.user'),
              pass: this.config.get<string>('smtp.pass'),
            }
          : undefined,
      });
    } else {
      this.transporter = null;
      this.logger.log(
        'SMTP não configurado — notificações por e-mail desativadas (no-op).',
      );
    }
  }

  get enabled(): boolean {
    return this.transporter !== null;
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.debug(
        `[no-op] E-mail para ${message.to}: ${message.subject}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      });
    } catch (error) {
      // Nunca propaga: falha de e-mail não pode desfazer a operação.
      this.logger.error(
        `Falha ao enviar e-mail para ${message.to}: ${String(error)}`,
      );
    }
  }

  async sendMany(messages: EmailMessage[]): Promise<void> {
    await Promise.all(messages.map((message) => this.send(message)));
  }
}
