import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../test/server";
import { API_BASE, exampleLink } from "../test/msw-handlers";
import { apiClient, ApiError } from "./client";
import type { Link } from "./types";

describe("apiClient", () => {
  it("разворачивает конверт и возвращает чистые data при успехе", async () => {
    server.use(http.get(`${API_BASE}/links/42`, () => HttpResponse.json({ data: exampleLink, error: null })));

    const result = await apiClient.get<Link>("/links/42");

    expect(result).toEqual(exampleLink);
  });

  it("бросает типизированный ApiError с кодом из error.code при ошибке контракта", async () => {
    server.use(
      http.get(`${API_BASE}/links/999`, () =>
        HttpResponse.json(
          { data: null, error: { code: "LINK_NOT_FOUND", message: "Link with id 999 was not found" } },
          { status: 404 },
        ),
      ),
    );

    const rejection = apiClient.get("/links/999");

    await expect(rejection).rejects.toBeInstanceOf(ApiError);
    await expect(rejection).rejects.toMatchObject({
      name: "ApiError",
      code: "LINK_NOT_FOUND",
      status: 404,
    });
  });

  it("прокидывает details у VALIDATION_ERROR", async () => {
    server.use(
      http.post(`${API_BASE}/links`, () =>
        HttpResponse.json(
          {
            data: null,
            error: {
              code: "VALIDATION_ERROR",
              message: "Validation failed",
              details: ["originalUrl must be a valid http(s) URL"],
            },
          },
          { status: 400 },
        ),
      ),
    );

    await expect(apiClient.post("/links", { originalUrl: "not-a-url" })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: ["originalUrl must be a valid http(s) URL"],
      status: 400,
    });
  });

  it("превращает сетевой сбой fetch в ApiError с кодом NETWORK_ERROR", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(apiClient.get("/links")).rejects.toMatchObject({
      name: "ApiError",
      code: "NETWORK_ERROR",
    });

    fetchSpy.mockRestore();
  });

  it("превращает ответ, не соответствующий конверту { data, error }, в NETWORK_ERROR", async () => {
    server.use(http.get(`${API_BASE}/broken`, () => HttpResponse.json({ unexpected: true })));

    await expect(apiClient.get("/broken")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
  });
});
