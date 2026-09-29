import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MailModule } from '../mail/mail.module';
import { SiteContentModule } from '../site-content/site-content.module';
import { AdminEnquiriesController, PublicEnquiriesController } from './enquiries.controller';
import { EnquiriesService } from './enquiries.service';
import { Counter, CounterSchema, Enquiry, EnquirySchema } from './enquiry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Enquiry.name, schema: EnquirySchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    MailModule,
    SiteContentModule,
  ],
  controllers: [PublicEnquiriesController, AdminEnquiriesController],
  providers: [EnquiriesService],
  exports: [EnquiriesService, MongooseModule],
})
export class EnquiriesModule {}
