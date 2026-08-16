/**
 * Адреса берутся только из окружения — проект должен уметь целиться в любое
 * развёртывание (локальный compose, staging) сменой переменных.
 * Дефолты рассчитаны на запуск с хоста против поднятого `make start`.
 */
export const API_URL = process.env.API_URL ?? 'http://localhost:8080';

/**
 * Строится backend'ом из его BASE_URL — по нему собираются shortUrl в ответах.
 * Имя переменной окружения здесь — TEST_SHORT_URL_BASE, не BASE_URL: Vitest
 * (через Vite) резервирует ключ BASE_URL под свой import.meta.env и затирает
 * им process.env.BASE_URL до импорта этого модуля.
 */
export const BASE_URL = process.env.TEST_SHORT_URL_BASE ?? 'http://localhost:8080';

/**
 * Только тестовая база. К dev-базе `linkboard` подключаться нельзя:
 * хелперы делают TRUNCATE.
 */
export const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://linkboard:linkboard@localhost:5432/linkboard_test';
