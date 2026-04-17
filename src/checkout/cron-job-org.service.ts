import { Injectable, Logger } from '@nestjs/common';
import { ScheduledJobResult } from 'src/interfaces/schedule-job-result';

@Injectable()
export class CronJobOrgService {
  private readonly logger = new Logger(CronJobOrgService.name);
  private readonly baseUrl = 'https://api.cron-job.org';
  private readonly headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.CRONJOB_ORG_API_KEY}`,
  };

  async UniqueJobSchedule(
    title: string,
    delayInMinutes: number,
    targetUrl: string,
  ) {
    const target = new Date(Date.now() + delayInMinutes * 60 * 1000);

    const schedule = {
      timezone: 'America/Sao_Paulo',
      expiresAt: Math.floor(target.getTime() / 1000) + 120, // expira 2min após
      hours: [target.getUTCHours()],
      mdays: [target.getUTCDate()],
      minutes: [target.getUTCMinutes()],
      months: [target.getUTCMonth() + 1],
      wdays: [-1],
    };

    const res = await fetch(`${this.baseUrl}/jobs`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        job: {
          title,
          url: targetUrl,
          enabled: true,
          saveResponses: false,
          requestMethod: 1, // POST
          extendedData: {
            headers: {
              'X-Cron-Secret': process.env.CRONJOB_ORG_SECRET,
            },
          },
          schedule,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json();

      this.logger.error(`Erro ao criar job: ${JSON.stringify(err)}`);

      throw new Error('Falha ao agendar job no cron-job.org');
    }

    const data: ScheduledJobResult = await res.json();
    this.logger.log(
      `Job agendado: ${data.jobId} para daqui ${delayInMinutes}min`,
    );

    return data.jobId;
  }

  async DeleteJob(jobId: number) {
    const res = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
      method: 'DELETE',
      headers: this.headers,
    });

    if (!res.ok) {
      this.logger.warn(`Falha ao deletar job ${jobId}`);
    }

    return 'Job deletado';
  }
}
