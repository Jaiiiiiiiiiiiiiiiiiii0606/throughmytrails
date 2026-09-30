import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUser } from '../auth/current-user.decorator';
import { APP_CONFIG, AppConfig } from '../config';
import { USER_AUDIENCE } from './user-auth.service';

/** Traveller access tokens: same signing key as admin tokens but a distinct audience, so neither works for the other. */
@Injectable()
export class UserJwtStrategy extends PassportStrategy(Strategy, 'user-jwt') {
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtAccessSecret,
      algorithms: ['HS256'],
      audience: USER_AUDIENCE,
    });
  }

  validate(payload: JwtUser): JwtUser {
    return { sub: payload.sub, email: payload.email, name: payload.name };
  }
}

@Injectable()
export class UserAuthGuard extends AuthGuard('user-jwt') {
  handleRequest<T>(err: unknown, user: T): T {
    if (err || !user) throw new UnauthorizedException('Please sign in to continue.');
    return user;
  }
}
