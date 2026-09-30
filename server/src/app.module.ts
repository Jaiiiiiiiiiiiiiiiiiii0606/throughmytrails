import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AccountModule } from './account/account.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './common/config.module';
import { CatalogModule } from './destinations/catalog.module';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { validateEnv } from './config';
import { EnquiriesModule } from './enquiries/enquiries.module';
import { MailModule } from './mail/mail.module';
import { MediaModule } from './media/media.module';
import { SettingsModule } from './settings/settings.module';
import { SiteContentModule } from './site-content/site-content.module';
import { StatsModule } from './stats/stats.module';
import { UserAuthModule } from './user-auth/user-auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv, cache: true }),
    AppConfigModule,
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.get<string>('MONGODB_URI') }),
    }),
    // Default budget for every route; stricter per-route limits use @Throttle().
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60 * 1000, limit: 120 }]),
    AdminUsersModule,
    AuthModule,
    SiteContentModule,
    MailModule,
    EnquiriesModule,
    MediaModule,
    StatsModule,
    SettingsModule,
    CatalogModule,
    UsersModule,
    UserAuthModule,
    AccountModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
