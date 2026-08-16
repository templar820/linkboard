import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { LinksToolbar } from "./LinksToolbar";

describe("LinksToolbar", () => {
  it("UNIT-FE-11: ввод в поиск вызывает onSearchChange только через 300мс дебаунса", () => {
    vi.useFakeTimers();
    try {
      const onSearchChange = vi.fn();
      renderWithProviders(
        <LinksToolbar search="" onSearchChange={onSearchChange} sort="created_at" order="desc" onSortChange={vi.fn()} />,
      );

      const input = screen.getByTestId("links-search-input");
      fireEvent.change(input, { target: { value: "promo" } });

      // До истечения дебаунса колбэк не вызван.
      expect(onSearchChange).not.toHaveBeenCalled();

      vi.advanceTimersByTime(299);
      expect(onSearchChange).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(onSearchChange).toHaveBeenCalledWith("promo");
      expect(onSearchChange).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("UNIT-FE-12: смена сортировки сразу вызывает onSortChange с новыми sort/order", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();

    renderWithProviders(
      <LinksToolbar search="" onSearchChange={vi.fn()} sort="created_at" order="desc" onSortChange={onSortChange} />,
    );

    await user.selectOptions(screen.getByTestId("links-sort-select"), "clicks_count-asc");

    expect(onSortChange).toHaveBeenCalledWith("clicks_count", "asc");
  });
});
