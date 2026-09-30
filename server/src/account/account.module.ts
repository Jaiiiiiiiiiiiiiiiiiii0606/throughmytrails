import { Module } from '@nestjs/common';
import { CatalogModule } from '../destinations/catalog.module';
import { EnquiriesModule } from '../enquiries/enquiries.module';
import { UserAuthModule } from '../user-auth/user-auth.module';
import { UsersModule } from '../users/users.module';
import { AccountController, AdminTravellersController } from './account.controller';

@Module({
  imports: [UsersModule, UserAuthModule, EnquiriesModule, CatalogModule],
  controllers: [AccountController, AdminTravellersController],
})
export class AccountModule {}
