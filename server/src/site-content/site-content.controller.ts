import { Body, Controller, Get, Header, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateSiteContentDto } from './dto/update-site-content.dto';
import { SiteContentService } from './site-content.service';

@ApiTags('public')
@Controller('public')
export class PublicSiteContentController {
  constructor(private readonly content: SiteContentService) {}

  @Get('site-content')
  @SkipThrottle()
  @Header('Cache-Control', 'no-cache')
  get() {
    return this.content.getPublic();
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/site-content')
export class AdminSiteContentController {
  constructor(private readonly content: SiteContentService) {}

  @Get()
  get() {
    return this.content.getAdmin();
  }

  @Put()
  update(@Body() dto: UpdateSiteContentDto) {
    return this.content.update(dto);
  }
}
