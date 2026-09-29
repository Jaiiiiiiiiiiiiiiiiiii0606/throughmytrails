import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Media, MediaSchema } from '../media/media.schema';
import { AdminSiteContentController, PublicSiteContentController } from './site-content.controller';
import { SiteContent, SiteContentSchema } from './site-content.schema';
import { SiteContentService } from './site-content.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SiteContent.name, schema: SiteContentSchema },
      { name: Media.name, schema: MediaSchema },
    ]),
  ],
  controllers: [PublicSiteContentController, AdminSiteContentController],
  providers: [SiteContentService],
  exports: [SiteContentService],
})
export class SiteContentModule {}
