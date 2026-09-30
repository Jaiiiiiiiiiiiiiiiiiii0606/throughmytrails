import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Media, MediaSchema } from '../media/media.schema';
import { AdminPackagesController, PublicPackagesController } from '../packages/packages.controller';
import { TravelPackage, TravelPackageSchema } from '../packages/package.schema';
import { PackagesService } from '../packages/packages.service';
import { Destination, DestinationSchema } from './destination.schema';
import { AdminDestinationsController, PublicDestinationsController } from './destinations.controller';
import { DestinationsService } from './destinations.service';

/** Destinations and the holiday packages that belong to them. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Destination.name, schema: DestinationSchema },
      { name: TravelPackage.name, schema: TravelPackageSchema },
      { name: Media.name, schema: MediaSchema },
    ]),
  ],
  controllers: [PublicDestinationsController, AdminDestinationsController, PublicPackagesController, AdminPackagesController],
  providers: [DestinationsService, PackagesService],
  exports: [DestinationsService, PackagesService],
})
export class CatalogModule {}
