/**
 * TanStack Query хуки для ресурса `links` (docs/api/contract.md, раздел 3.2).
 *
 * Ключи запросов организованы иерархически под общим корнем `['links']`,
 * поэтому `invalidateQueries({ queryKey: ['links'] })` после любой мутации
 * инвалидирует и список, и все открытые карточки деталей разом.
 */
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { apiClient, type QueryParams } from "./client";
import type {
  CreateLinkRequest,
  DeleteResult,
  Link,
  LinkList,
  ListLinksParams,
  UpdateLinkRequest,
} from "./types";

export const linksKeys = {
  all: ["links"] as const,
  lists: () => [...linksKeys.all, "list"] as const,
  list: (params: ListLinksParams) => [...linksKeys.lists(), params] as const,
  details: () => [...linksKeys.all, "detail"] as const,
  detail: (id: number) => [...linksKeys.details(), id] as const,
};

// Интерфейсы контракта (ListLinksParams и т.п.) не имеют явной индексной
// сигнатуры, поэтому TS не разрешает присвоить их напрямую в
// Record<string, QueryValue> ("Index signature for type 'string' is
// missing"). Оператор spread даёт TS выведенный (anonymous) тип объекта,
// который такому присвоению уже не мешает.
function toQueryParams<T extends object>(params: T): QueryParams {
  return { ...params } as QueryParams;
}

/** Список ссылок с пагинацией/поиском/сортировкой — `GET /api/links`. */
export function useLinks(params: ListLinksParams = {}): UseQueryResult<LinkList, Error> {
  return useQuery({
    queryKey: linksKeys.list(params),
    queryFn: () => apiClient.get<LinkList>("/links", toQueryParams(params)),
    // при смене страницы/фильтра — не мигать в loading, держать старые данные
    placeholderData: keepPreviousData,
  });
}

/** Одна ссылка — `GET /api/links/:id`. */
export function useLink(id: number | undefined): UseQueryResult<Link, Error> {
  return useQuery({
    queryKey: linksKeys.detail(id ?? -1),
    queryFn: () => apiClient.get<Link>(`/links/${String(id)}`),
    enabled: id !== undefined,
  });
}

/** Создать ссылку — `POST /api/links`. */
export function useCreateLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLinkRequest) => apiClient.post<Link>("/links", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: linksKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

/** Изменить title/isActive/originalUrl — `PATCH /api/links/:id`. */
export function useUpdateLink(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateLinkRequest) => apiClient.patch<Link>(`/links/${String(id)}`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: linksKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

/** Удалить ссылку — `DELETE /api/links/:id`. */
export function useDeleteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<DeleteResult>(`/links/${String(id)}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: linksKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
