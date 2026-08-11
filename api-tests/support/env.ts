/**
 * Адреса берутся только из окружения — проект должен уметь целиться в любое
 * развёртывание (локальный compose, staging) сменой переменных.
 * Дефолты рассчитаны на запуск с хоста против поднятого `make start`.
 */
export const API_URL = process.env.API_URL ?? 'http://localhost:8080';

/** Строится backend'ом из его BASE_URL — по нему собираются shortUrl в ответах. */
export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';

/**
 * Только тестовая база. К dev-базе `linkboard` подключаться нельзя:
 * хелперы делают TRUNCATE.
 */
export const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://linkboard:linkboard@localhost:5432/linkboard_test';
