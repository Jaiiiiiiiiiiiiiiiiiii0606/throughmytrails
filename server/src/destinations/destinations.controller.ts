import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DestinationsService } from './destinations.service';
import { DestinationDto, IdParam, ReorderDto, SlugParam } from './dto/destination.dto';

export class PublishDto {
  @IsBoolean()
  published: boolean;
}

@ApiTags('public')
@Controller('public/destinations')
export class PublicDestinationsController {
  constructor(private readonly destinations: DestinationsService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  list() {
    return this.destinations.listPublic();
  }

  @Get(':slug')
  @Header('Cache-Control', 'public, max-age=60')
  get(@Param() { slug }: SlugParam) {
    return this.destinations.getPublic(slug);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/destinations')
export class AdminDestinationsController {
  constructor(private readonly destinations: DestinationsService) {}

  @Get()
  list() {
    return this.destinations.listAdmin();
  }

  @Post()
  create(@Body() dto: DestinationDto) {
    return this.destinations.create(dto);
  }

  // Declared before ":id" so "reorder" is not captured as an id.
  @Put('reorder')
  reorder(@Body() dto: ReorderDto) {
    return this.destinations.reorder(dto.ids);
  }

  @Get(':id')
  get(@Param() { id }: IdParam) {
    return this.destinations.getAdmin(id);
  }

  @Put(':id')
  update(@Param() { id }: IdParam, @Body() dto: DestinationDto) {
    return this.destinations.update(id, dto);
  }

  @Patch(':id/publish')
  publish(@Param() { id }: IdParam, @Body() dto: PublishDto) {
    return this.destinations.setPublished(id, dto.published);
  }

  @Delete(':id')
  remove(@Param() { id }: IdParam) {
    return this.destinations.remove(id);
  }
}
