import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsMongoId, IsString, MaxLength } from 'class-validator';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CleanString } from '../common/sanitize';
import { MediaService } from './media.service';

export class MediaIdParam {
  @IsMongoId({ message: 'Invalid image id.' })
  id: string;
}

export class UpdateMediaDto {
  @ApiProperty({ example: 'Snow-capped peaks at sunrise' })
  @CleanString()
  @IsString()
  @MaxLength(200)
  alt: string;
}

export const MAX_FILES_PER_UPLOAD = 20;

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        alts: { type: 'string', description: 'Optional JSON array of alt texts, same order as files.' },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', MAX_FILES_PER_UPLOAD))
  upload(@UploadedFiles() files: Express.Multer.File[], @CurrentUser() user: JwtUser, @Body('alts') alts?: string) {
    let altList: string[] = [];
    try {
      const parsed = alts ? JSON.parse(alts) : [];
      if (Array.isArray(parsed)) altList = parsed.map((a) => String(a ?? '').replace(/[<>]/g, '').trim());
    } catch {
      altList = [];
    }
    return this.media.createFromUploads(files, user.sub, altList);
  }

  @Get()
  list() {
    return this.media.list();
  }

  @Patch(':id')
  update(@Param() { id }: MediaIdParam, @Body() dto: UpdateMediaDto) {
    return this.media.updateAlt(id, dto.alt);
  }

  @Delete(':id')
  @ApiQuery({ name: 'force', required: false, type: Boolean, description: 'Delete even if assigned to a slot.' })
  remove(@Param() { id }: MediaIdParam, @Query('force', new ParseBoolPipe({ optional: true })) force?: boolean) {
    return this.media.remove(id, !!force);
  }
}
