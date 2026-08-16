import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Link } from "../../api/types";
import { renderWithProviders } from "../../test/renderWithProviders";
import { LinksTable } from "./LinksTable";

const LINKS: readonly Link[] = [
  {
    id: 1,
    code: "abc1234",
    shortUrl: "http://localhost:8080/abc1234",
    originalUrl: "https://example.com/one",
    title: "Первая ссылка",
    clicksCount: 42,
    isActive: true,
    createdAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: 2,
    code: "def5678",
    shortUrl: "http://localhost:8080/def5678",
    originalUrl: "https://example.com/two",
    title: null,
    clicksCount: 7,
    isActive: false,
    createdAt: "2026-08-02T10:00:00.000Z",
  },
];

describe("LinksTable", () => {
  it("UNIT-FE-07: построчно рендерит список ссылок (code, url, title, клики, дата)", () => {
    renderWithProviders(
      <LinksTable links={LINKS} isLoading={false} isError={false} onRetry={vi.fn()} hasSearch={false} />,
    );

    const codeCells = screen.getAllByTestId("links-table-row-code");
    expect(codeCells).toHaveLength(2);
    expect(codeCells[0]).toHaveTextContent("abc1234");
    expect(codeCells[1]).toHaveTextContent("def5678");

    expect(screen.getByText("https://example.com/one")).toBeInTheDocument();
    expect(screen.getByText("Первая ссылка")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("UNIT-FE-08: пустой список показывает EmptyState вместо таблицы", () => {
    renderWithProviders(
      <LinksTable links={[]} isLoading={false} isError={false} onRetry={vi.fn()} hasSearch={false} />,
    );

    expect(screen.getByTestId("links-table-empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("links-table-row-code")).not.toBeInTheDocument();
  });

  it("UNIT-FE-09: состояние ошибки запроса показывает ErrorState вместо таблицы", () => {
    renderWithProviders(
      <LinksTable links={[]} isLoading={false} isError={true} onRetry={vi.fn()} hasSearch={false} />,
    );

    expect(screen.getByTestId("links-table-error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("links-table-empty-state")).not.toBeInTheDocument();
  });

  it("UNIT-FE-10: CopyButton кладёт shortUrl первой строки в буфер обмена", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderWithProviders(
      <LinksTable links={LINKS} isLoading={false} isError={false} onRetry={vi.fn()} hasSearch={false} />,
    );

    const copyButtons = screen.getAllByTestId("links-table-row-copy-button");
    await user.click(copyButtons[0]!);

    expect(writeText).toHaveBeenCalledWith(LINKS[0]!.shortUrl);
  });
});
