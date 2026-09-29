import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { APP_CONFIG, AppConfig } from './config';
import { resolveUploadDir } from './media/upload.util';

/** Shared by main.ts and the e2e tests so both run the exact same pipeline. */
export function configureApp(app: NestExpressApplication): AppConfig {
  const config = app.get<AppConfig>(APP_CONFIG);

  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.setGlobalPrefix('api');

  app.use(
    helmet({
      // The API only serves JSON and images; images are embedded by the client on another origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );
  app.use(cookieParser());

  app.enableCors({
    origin: (origin, cb) => {
      // Same-origin / server-to-server requests have no Origin header.
      if (!origin || config.clientUrls.includes(origin.replace(/\/+$/, ''))) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.useStaticAssets(resolveUploadDir(config.uploadDir), {
    prefix: '/uploads/',
    index: false,
    dotfiles: 'deny',
    maxAge: '30d',
    immutable: true,
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  });

  const doc = new DocumentBuilder()
    .setTitle('Through My Trails API')
    .setDescription('Enquiries, site content, media and admin endpoints.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc), {
    customSiteTitle: 'Through My Trails API',
  });

  app.enableShutdownHooks();
  return config;
}
