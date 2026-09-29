import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Readable } from 'stream';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddNoteDto, BulkStatusDto, EnquiryIdParam, ListEnquiriesQuery, UpdateEnquiryDto } from './dto/admin-enquiry.dto';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { EnquiriesService } from './enquiries.service';

export const ENQUIRY_LIMIT = { limit: 5, ttl: 10 * 60 * 1000 };

@ApiTags('public')
@Controller('enquiries')
export class PublicEnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @Post()
  @Throttle({ default: ENQUIRY_LIMIT })
  @ApiCreatedResponse({ schema: { example: { referenceId: 'TMT-2026-0042', name: 'Aarav Mehta' } } })
  async create(@Body() dto: CreateEnquiryDto, @Req() req: Request) {
    if (dto.website) {
      // Honeypot tripped: respond like a success so bots learn nothing, but store nothing.
      return { referenceId: null, name: dto.name };
    }
    const e = await this.enquiries.create(dto, { ip: req.ip, userAgent: req.get('user-agent') });
    return { referenceId: e.referenceId, name: e.name };
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/enquiries')
export class AdminEnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @Get()
  list(@Query() q: ListEnquiriesQuery) {
    return this.enquiries.list(q);
  }

  // Declared before ":id" so "export.csv" and "bulk-status" are not captured as ids.
  @Get('export.csv')
  @ApiProduces('text/csv')
  export(@Query() q: ListEnquiriesQuery, @Res() res: Response) {
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="enquiries-${stamp}.csv"`);
    const stream = Readable.from(this.enquiries.exportCsv(q));
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  }

  @Patch('bulk-status')
  bulkStatus(@Body() dto: BulkStatusDto) {
    return this.enquiries.bulkStatus(dto);
  }

  @Get(':id')
  get(@Param() { id }: EnquiryIdParam) {
    return this.enquiries.get(id);
  }

  @Patch(':id')
  update(@Param() { id }: EnquiryIdParam, @Body() dto: UpdateEnquiryDto) {
    return this.enquiries.update(id, dto);
  }

  @Post(':id/notes')
  addNote(@Param() { id }: EnquiryIdParam, @Body() dto: AddNoteDto, @CurrentUser() user: JwtUser) {
    return this.enquiries.addNote(id, dto, user.name || user.email);
  }

  @Post(':id/resend-email')
  @HttpCode(200)
  resend(@Param() { id }: EnquiryIdParam) {
    return this.enquiries.resendConfirmation(id);
  }

  @Delete(':id')
  remove(@Param() { id }: EnquiryIdParam) {
    return this.enquiries.softDelete(id);
  }
}
