import { BadGatewayException, Body, Controller, Get, HttpCode, Inject, Module, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsOptional } from 'class-validator';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NormalizeEmail } from '../common/sanitize';
import { APP_CONFIG, AppConfig } from '../config';
import { MailModule } from '../mail/mail.module';
import { MailService } from '../mail/mail.service';

export class TestEmailDto {
  @ApiPropertyOptional({ description: 'Defaults to ADMIN_NOTIFY_EMAIL.' })
  @IsOptional()
  @NormalizeEmail()
  @IsEmail({}, { message: 'Enter a valid email address.' })
  to?: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/settings')
export class SettingsController {
  constructor(
    private readonly mail: MailService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get('mail')
  mailStatus() {
    return {
      configured: this.mail.isConfigured,
      from: this.config.smtp.from,
      host: this.mail.transportLabel,
      notifyEmail: this.config.adminNotifyEmail,
    };
  }

  @Post('test-email')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60 * 1000 } })
  async testEmail(@Body() dto: TestEmailDto, @CurrentUser() user: JwtUser) {
    const to = dto.to || this.config.adminNotifyEmail;
    try {
      await this.mail.sendTest(to, user.name || user.email);
    } catch (e) {
      throw new BadGatewayException(`The test email could not be sent: ${e instanceof Error ? e.message : String(e)}`);
    }
    return { ok: true, to };
  }
}

@Module({
  imports: [MailModule],
  controllers: [SettingsController],
})
export class SettingsModule {}
