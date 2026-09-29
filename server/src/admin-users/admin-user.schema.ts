import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AdminUserDocument = HydratedDocument<AdminUser>;

@Schema({ timestamps: true, collection: 'admin_users' })
export class AdminUser {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, default: 'admin', enum: ['admin'] })
  role: 'admin';

  @Prop()
  lastLoginAt?: Date;

  /** SHA-256 digests of live refresh tokens, one per signed-in device (newest last, capped). */
  @Prop({ type: [String], select: false, default: [] })
  refreshTokenHashes: string[];
}

export const AdminUserSchema = SchemaFactory.createForClass(AdminUser);
