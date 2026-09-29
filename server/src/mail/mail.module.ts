import { Module } from '@nestjs/common';
import { SiteContentModule } from '../site-content/site-content.module';
import { MailService } from './mail.service';

@Module({
  imports: [SiteContentModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
