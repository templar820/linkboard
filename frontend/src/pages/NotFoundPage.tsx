import { Link } from "react-router";

/** Маршрут-заглушка `*` — любой неизвестный путь. */
export function NotFoundPage() {
  return (
    <div>
      <h1>404 — страница не найдена</h1>
      <p>
        <Link to="/">Вернуться на дашборд</Link>
      </p>
    </div>
  );
}

export default NotFoundPage;
