import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { COMPANIONS, Companion, PLAN_BUDGETS, PLAN_INTERESTS, PlanBudget, PlanInterest } from '../common/constants';

@Schema({ _id: false })
export class UserProviders {
  /** Google account id (`sub`). */
  @Prop()
  google?: string;

  /** Apple account id (`sub`). */
  @Prop()
  apple?: string;
}
export const UserProvidersSchema = SchemaFactory.createForClass(UserProviders);

@Schema({ _id: false })
export class UserPreferences {
  @Prop({ type: String, enum: [...COMPANIONS, null], default: null })
  companion?: Companion | null;

  @Prop({ type: String, enum: [...PLAN_BUDGETS, null], default: null })
  budget?: PlanBudget | null;

  @Prop({ type: [String], enum: PLAN_INTERESTS, default: [] })
  interests: PlanInterest[];
}
export const UserPreferencesSchema = SchemaFactory.createForClass(UserPreferences);

export type UserDocument = HydratedDocument<User>;

/** A traveller account (separate from admin_users). */
@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ default: '' })
  homeCity: string;

  /** From Google, when signed in with Google. */
  @Prop({ default: '' })
  avatarUrl: string;

  @Prop({ type: UserProvidersSchema, default: () => ({}) })
  providers: UserProviders;

  @Prop({ type: UserPreferencesSchema, default: () => ({}) })
  preferences: UserPreferences;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Destination' }], default: [] })
  savedDestinations: Types.ObjectId[];

  @Prop({ type: [String], select: false, default: [] })
  refreshTokenHashes: string[];

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  welcomeEmailSentAt?: Date;

  /** Blocked by an admin: cannot sign in. */
  @Prop({ default: false })
  blocked: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ 'providers.google': 1 }, { unique: true, sparse: true });
UserSchema.index({ 'providers.apple': 1 }, { unique: true, sparse: true });
UserSchema.index({ createdAt: -1 });

/** One-time sign-in codes. Mongo removes them at `expiresAt`. */
@Schema({ collection: 'login_codes', versionKey: false })
export class LoginCode {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  codeHash: string;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: () => new Date() })
  createdAt: Date;
}
export const LoginCodeSchema = SchemaFactory.createForClass(LoginCode);
LoginCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
