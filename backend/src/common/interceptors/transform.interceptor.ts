import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiSuccessEnvelope<T> {
  data: T;
  error: null;
}

/**
 * Оборачивает любой успешный ответ хендлера в конверт { data, error: null },
 * как того требует docs/api/contract.md §1.
 *
 * Краевой случай: публичный редирект GET /:code (задача T12) управляет
 * ответом сам через @Res() (302 Found без тела) и к моменту, когда этот
 * интерсептор отработает, заголовки уже отправлены — оборачивать в JSON
 * в этом случае нельзя (и не нужно: Nest в принципе не использует
 * возвращаемое значение хендлера, если используется необёрнутый @Res()).
 * Проверка response.headersSent — дополнительная защита от попытки
 * записать тело в уже отправленный ответ.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiSuccessEnvelope<T> | T> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessEnvelope<T> | T> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse<Response>();

        if (response?.headersSent) {
          return data;
        }

        return {
          data: data === undefined ? (null as unknown as T) : data,
          error: null,
        };
      }),
    );
  }
}
