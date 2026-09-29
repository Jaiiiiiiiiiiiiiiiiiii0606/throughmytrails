import { Controller, Get, Module, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EnquiriesModule } from '../enquiries/enquiries.module';
import { SiteContentModule } from '../site-content/site-content.module';
import { StatsService } from './stats.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  get() {
    return this.stats.get();
  }
}

@Module({
  imports: [EnquiriesModule, SiteContentModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
