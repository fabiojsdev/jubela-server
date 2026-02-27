import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { REQUEST_TOKEN_PAYLOAD_KEY } from '../auth.constants';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  logger = new Logger('Throttler guard');

  protected async getTracker(req: Record<string, any>): Promise<string> {
    this.logger.log(req[REQUEST_TOKEN_PAYLOAD_KEY]);

    return (
      req[REQUEST_TOKEN_PAYLOAD_KEY]?.sub ??
      (req.ips.length ? req.ips[0] : req.ip)
    );
  }
}
