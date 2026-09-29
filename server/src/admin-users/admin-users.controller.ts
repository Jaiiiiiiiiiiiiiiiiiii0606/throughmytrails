import { Body, Controller, Get, HttpCode, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminUsersService } from './admin-users.service';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  currentPassword: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10, { message: 'New password must be at least 10 characters.' })
  @MaxLength(200)
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, { message: 'New password must include at least one letter and one number.' })
  newPassword: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/me')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  async me(@CurrentUser() user: JwtUser) {
    const u = await this.users.findById(user.sub);
    return { id: u?.id, email: u?.email, name: u?.name, role: u?.role, lastLoginAt: u?.lastLoginAt };
  }

  @Patch('password')
  @HttpCode(200)
  async changePassword(@CurrentUser() user: JwtUser, @Body() dto: ChangePasswordDto) {
    await this.users.changePassword(user.sub, dto.currentPassword, dto.newPassword);
    return { ok: true };
  }
}
