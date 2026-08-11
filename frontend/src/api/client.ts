/**
 * Тонкий HTTP-клиент поверх fetch.
 *
 * Разворачивает конверт `{ data, error }` (docs/api/contract.md, раздел 1):
 * при `error !== null` бросает типизированный `ApiError`, при успехе
 * возвращает чистые `data` — компоненты выше по стеку конверт не видят.
 *
 * Сетевые сбои (offline, DNS, CORS, обрыв) и ответы, которые физически не
 * являются валидным конвертом (не JSON, HTML от прокси, `{}` и т.п.) —
 * маппятся в клиентский код ошибки `NETWORK_ERROR` (docs/api/error-codes.md).
 */
import type { ApiEnvelope, ErrorCode } from "./types";

export interface ApiErrorParams {
  code: ErrorCode;
  message: string;
  details?: string[];
  /** HTTP-статус ответа; 0 для сетевых сбоев, до которых ответ не дошёл. */
  status: number;
}

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly details: string[] | undefined;
  readonly status: number;

  constructor(params: ApiErrorParams) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.details = params.details;
    this.status = params.status;
  }
}

/**
 * Базовый URL backend API. VITE_API_URL приходит из окружения контейнера
 * (docker-compose.yml); в dev без докера — дефолт localhost:8080.
 * Все admin-panel эндпоинты живут под префиксом /api (см. contract.md).
 */
const API_ORIGIN: string =
  (import.meta.env.VITE_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");
const API_BASE = `${API_ORIGIN}/api`;

export type QueryValue = string | number | boolean | undefined;
export type QueryParams = Record<string, QueryValue>;

function buildQueryString(params?: QueryParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

/**
 * Рантайм-проверка формы ответа: объект с полями `data`/`error`, где ровно
 * одно из них `null` (инвариант конверта из contract.md, раздел 1).
 */
function isEnvelopeShape(json: unknown): json is ApiEnvelope<unknown> {
  if (typeof json !== "object" || json === null) return false;
  if (!("data" in json) || !("error" in json)) return false;
  const { data, error } = json as { data: unknown; error: unknown };
  return (data === null) !== (error === null);
}

function networkError(status: number): ApiError {
  return new ApiError({
    code: "NETWORK_ERROR",
    message: "Network request failed",
    status,
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    // fetch бросает только на сетевом уровне (offline/DNS/CORS/таймаут) —
    // ответ до клиента не дошёл вообще.
    throw networkError(0);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    // Тело не JSON (например, HTML-страница ошибки от прокси/инфраструктуры).
    throw networkError(response.status);
  }

  if (!isEnvelopeShape(json)) {
    // JSON распарсился, но не соответствует контракту { data, error }.
    throw networkError(response.status);
  }

  const envelope = json as ApiEnvelope<T>;
  if (envelope.error !== null) {
    const { code, message, details } = envelope.error;
    // exactOptionalPropertyTypes: `details` включается в объект только когда
    // реально присутствует — явный `details: undefined` запрещён типом.
    throw new ApiError(
      details !== undefined
        ? { code, message, details, status: response.status }
        : { code, message, status: response.status },
    );
  }

  return envelope.data;
}

function jsonInit(method: "POST" | "PATCH", body: unknown): RequestInit {
  // exactOptionalPropertyTypes: RequestInit.body не допускает явный
  // `undefined` — при отсутствии тела просто не задаём это свойство.
  return body !== undefined ? { method, body: JSON.stringify(body) } : { method };
}

export const apiClient = {
  get<T>(path: string, params?: QueryParams): Promise<T> {
    return request<T>(`${path}${buildQueryString(params)}`, { method: "GET" });
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, jsonInit("POST", body));
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, jsonInit("PATCH", body));
  },
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: "DELETE" });
  },
};
