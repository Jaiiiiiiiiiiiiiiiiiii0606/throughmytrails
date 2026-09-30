import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PublishDto } from '../destinations/destinations.controller';
import { IdParam, SlugParam } from '../destinations/dto/destination.dto';
import { PackageDto, PublicPackagesQuery } from './dto/package.dto';
import { PackagesService } from './packages.service';

@ApiTags('public')
@Controller('public/packages')
export class PublicPackagesController {
  constructor(private readonly packages: PackagesService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  list(@Query() q: PublicPackagesQuery) {
    return this.packages.listPublic(q);
  }

  @Get(':slug')
  @Header('Cache-Control', 'public, max-age=60')
  get(@Param() { slug }: SlugParam) {
    return this.packages.getPublic(slug);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/packages')
export class AdminPackagesController {
  constructor(private readonly packages: PackagesService) {}

  @Get()
  list() {
    return this.packages.listAdmin();
  }

  @Post()
  create(@Body() dto: PackageDto) {
    return this.packages.create(dto);
  }

  @Get(':id')
  get(@Param() { id }: IdParam) {
    return this.packages.getAdmin(id);
  }

  @Put(':id')
  update(@Param() { id }: IdParam, @Body() dto: PackageDto) {
    return this.packages.update(id, dto);
  }

  @Patch(':id/publish')
  publish(@Param() { id }: IdParam, @Body() dto: PublishDto) {
    return this.packages.setPublished(id, dto.published);
  }

  @Post(':id/duplicate')
  duplicate(@Param() { id }: IdParam) {
    return this.packages.duplicate(id);
  }

  @Delete(':id')
  remove(@Param() { id }: IdParam) {
    return this.packages.remove(id);
  }
}
