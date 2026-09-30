import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { APP_CONFIG, AppConfig } from '../config';
import { JwtUser } from './current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtAccessSecret,
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtUser & { typ?: string; aud?: string | string[] }): JwtUser {
    // Traveller tokens share the signing key but carry an audience; they must never open the admin API.
    if (payload.aud !== undefined) throw new UnauthorizedException();
    return { sub: payload.sub, email: payload.email, name: payload.name };
  }
}
