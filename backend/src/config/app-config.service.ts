import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodeEnvironment } from './env.validation';

/**
 * Типизированная обёртка над ConfigService — единая точка доступа к env
 * во всём приложении вместо разрозненных process.env.* по модулям.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get port(): number {
    return this.configService.getOrThrow<number>('PORT');
  }

  get nodeEnv(): NodeEnvironment {
    return this.configService.getOrThrow<NodeEnvironment>('NODE_ENV');
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === NodeEnvironment.Development;
  }

  get isProduction(): boolean {
    return this.nodeEnv === NodeEnvironment.Production;
  }

  get databaseUrl(): string {
    return this.configService.getOrThrow<string>('DATABASE_URL');
  }

  get baseUrl(): string {
    return this.configService.getOrThrow<string>('BASE_URL');
  }

  get corsOrigin(): string {
    return this.configService.getOrThrow<string>('CORS_ORIGIN');
  }
}
