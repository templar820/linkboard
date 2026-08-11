import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { App } from "../App";

function renderAppAt(initialEntry: string) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Смоук-тест роутинга admin-panel", () => {
  it("рендерит DashboardPage на /", () => {
    renderAppAt("/");

    expect(screen.getByRole("heading", { name: "Дашборд" })).toBeInTheDocument();
    expect(screen.getByTestId("summary-card-total-links")).toBeInTheDocument();
  });

  it("рендерит LinksPage на /links", () => {
    renderAppAt("/links");

    expect(screen.getByRole("heading", { name: "Ссылки" })).toBeInTheDocument();
    expect(screen.getByTestId("links-table")).toBeInTheDocument();
  });

  it("рендерит CreateLinkPage на /links/new", () => {
    renderAppAt("/links/new");

    expect(screen.getByRole("heading", { name: "Новая ссылка" })).toBeInTheDocument();
    expect(screen.getByTestId("link-form")).toBeInTheDocument();
  });

  it("рендерит LinkDetailsPage на /links/:id", () => {
    renderAppAt("/links/42");

    expect(screen.getByRole("heading", { name: "Ссылка #42" })).toBeInTheDocument();
    expect(screen.getByTestId("link-header")).toBeInTheDocument();
  });

  it("рендерит NotFoundPage на неизвестном маршруте", () => {
    renderAppAt("/this-route-does-not-exist");

    expect(screen.getByRole("heading", { name: "404 — страница не найдена" })).toBeInTheDocument();
  });
});
