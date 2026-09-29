import { Inject, Injectable } from '@nestjs/common';
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

  validate(payload: JwtUser & { typ?: string }): JwtUser {
    return { sub: payload.sub, email: payload.email, name: payload.name };
  }
}
