import { plainToInstance, Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min, validateSync } from 'class-validator';

export enum NodeEnvironment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Обязательные переменные окружения бэкенда (docker-compose.yml, сервис backend):
 * PORT, NODE_ENV, DATABASE_URL, BASE_URL, CORS_ORIGIN. Валидируется один раз
 * при старте приложения (ConfigModule.forRoot({ validate })) — при отсутствии
 * или некорректности любой переменной приложение обязано упасть сразу
 * с понятной ошибкой, а не на первом запросе.
 */
class EnvironmentVariables {
  @IsIn([NodeEnvironment.Development, NodeEnvironment.Production, NodeEnvironment.Test])
  NODE_ENV: NodeEnvironment = NodeEnvironment.Development;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 8080;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  BASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN!: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join('; '))
      .join(' | ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return validated;
}
