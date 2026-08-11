import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { validationExceptionFactory } from './common/pipes/validation-exception-factory';
import { AppConfigService } from './config/app-config.service';

// -----------------------------------------------------------------------------
// Решение по префиксу /api и публичному редиректу GET /:code (см. также T12).
//
// Мы НЕ используем app.setGlobalPrefix('api', { exclude: [...] }). У exclude
// список исключений нужно поддерживать вручную при каждом новом API-модуле,
// а забытая запись означает, что редирект-роут тихо перехватит API-путь.
//
// Вместо этого каждый API-контроллер сам объявляет полный путь 'api/...' в
// @Controller() (см. HealthController: @Controller('api/health')). Будущий
// RedirectController (T12) объявляется как @Controller() + @Get(':code') —
// без какого-либо префикса.
//
// Благодаря этому у /api/* и /:code структурно нет пересечения маршрутов:
// любой /api/* эндпоинт состоит минимум из двух сегментов пути ('api' +
// имя ресурса), тогда как /:code — всегда ровно один сегмент. Nest/Express
// матчит маршруты по количеству и литеральности сегментов, поэтому
// /api/health или /api/links/:id никогда не будут спутаны с /:code —
// независимо от порядка регистрации модулей в AppModule. Единственный
// вырожденный случай — GET /api (без второго сегмента) технически совпадает
// по форме с /:code (code = "api"); от него защищает резерв-список коротких
// кодов (docs/api/contract.md §6: 'api', 'health' запрещены как code) —
// такая ссылка физически не может быть создана, поэтому это 404, а не утечка.
//
// Вывод для T12: RedirectModule достаточно объявить с @Controller() и
// @Get(':code') и импортировать в AppModule — никаких правок main.ts не
// потребуется. Порядок регистрации модулей значения не имеет.
// -----------------------------------------------------------------------------

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);

  app.enableCors({
    origin: config.corsOrigin,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      // Формирует 400 VALIDATION_ERROR с error.details: string[] по
      // docs/api/error-codes.md, вместо стандартного тела Nest
      // { statusCode, message: string[], error: 'Bad Request' }.
      exceptionFactory: validationExceptionFactory,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(config.port, '0.0.0.0');

  Logger.log(`Backend listening on http://0.0.0.0:${config.port} (${config.nodeEnv})`, 'Bootstrap');
}

bootstrap();
