import { BadRequestException, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { IMAGE_MIME_TYPES } from '../common/constants';
import { APP_CONFIG, AppConfig } from '../config';
import { SiteContentModule } from '../site-content/site-content.module';
import { MAX_FILES_PER_UPLOAD, MediaController } from './media.controller';
import { Media, MediaSchema } from './media.schema';
import { MediaService } from './media.service';
import { ALLOWED_EXTENSIONS, randomFilename, resolveUploadDir } from './upload.util';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Media.name, schema: MediaSchema }]),
    SiteContentModule,
    MulterModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => {
        const dir = resolveUploadDir(config.uploadDir);
        mkdirSync(dir, { recursive: true });
        return {
          storage: diskStorage({
            destination: dir,
            filename: (_req, file, cb) => cb(null, randomFilename(file.mimetype)),
          }),
          limits: { fileSize: config.maxUploadBytes, files: MAX_FILES_PER_UPLOAD, fields: 10, parts: MAX_FILES_PER_UPLOAD + 10 },
          fileFilter: (_req, file, cb) => {
            const okMime = (IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype);
            const okExt = ALLOWED_EXTENSIONS.includes(extname(file.originalname).toLowerCase());
            if (!okMime || !okExt) {
              return cb(new BadRequestException(`"${file.originalname}" is not allowed. Use JPG, PNG or WebP.`), false);
            }
            cb(null, true);
          },
        };
      },
    }),
  ],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
