import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { API_BASE, exampleLink } from "../../test/msw-handlers";
import { renderWithProviders } from "../../test/renderWithProviders";
import { server } from "../../test/server";
import { LinkForm } from "./LinkForm";

describe("LinkForm", () => {
  it("UNIT-FE-04: сабмит валидного URL отправляет POST /api/links с телом формы", async () => {
    const user = userEvent.setup();
    let capturedBody: unknown;
    server.use(
      http.post(`${API_BASE}/links`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ data: exampleLink, error: null }, { status: 201 });
      }),
    );

    renderWithProviders(<LinkForm />, { initialEntries: ["/links/new"] });

    await user.type(screen.getByTestId("link-form-original-url-input"), "https://example.com/a");
    await user.type(screen.getByTestId("link-form-title-input"), "Заголовок");
    await user.type(screen.getByTestId("link-form-custom-code-input"), "promo1");
    await user.click(screen.getByTestId("link-form-submit-button"));

    await waitFor(() => {
      expect(capturedBody).toEqual({
        originalUrl: "https://example.com/a",
        title: "Заголовок",
        customCode: "promo1",
      });
    });
  });

  it("UNIT-FE-05: ответ 409 CODE_TAKEN показывает ошибку под полем alias без навигации", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_BASE}/links`, () =>
        HttpResponse.json(
          { data: null, error: { code: "CODE_TAKEN", message: "Short code 'promo' is already in use" } },
          { status: 409 },
        ),
      ),
    );

    renderWithProviders(<LinkForm />, { initialEntries: ["/links/new"] });

    await user.type(screen.getByTestId("link-form-original-url-input"), "https://example.com/a");
    await user.type(screen.getByTestId("link-form-custom-code-input"), "promo");
    await user.click(screen.getByTestId("link-form-submit-button"));

    expect(await screen.findByTestId("link-form-custom-code-error")).toHaveTextContent(
      "Short code 'promo' is already in use",
    );
    // Форма осталась на месте — навигации не произошло.
    expect(screen.getByTestId("link-form")).toBeInTheDocument();
  });

  it("UNIT-FE-06: кнопка submit задизейблена во время запроса и снова активна после ответа", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_BASE}/links`, async () => {
        await delay(50);
        return HttpResponse.json(
          { data: null, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
          { status: 500 },
        );
      }),
    );

    renderWithProviders(<LinkForm />, { initialEntries: ["/links/new"] });
    await user.type(screen.getByTestId("link-form-original-url-input"), "https://example.com/a");

    const submitButton = screen.getByTestId("link-form-submit-button");
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });
});
