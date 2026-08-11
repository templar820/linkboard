import { setupServer } from "msw/node";
import { handlers } from "./msw-handlers";

/** msw-сервер для vitest (node), см. `src/test/setup.ts`. */
export const server = setupServer(...handlers);
