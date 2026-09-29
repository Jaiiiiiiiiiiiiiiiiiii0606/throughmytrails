import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Connection } from 'mongoose';

/** Liveness probe for the host and for uptime pingers that keep a free instance awake. */
@ApiTags('public')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @SkipThrottle()
  @Header('Cache-Control', 'no-store')
  check() {
    const db = this.connection.readyState === 1 ? 'up' : 'down';
    if (db !== 'up') throw new ServiceUnavailableException('Database is not connected.');
    return { status: 'ok', db, uptime: Math.round(process.uptime()) };
  }
}
