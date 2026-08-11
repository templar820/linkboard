import { LinkForm } from "../components/links/LinkForm";
import { Card } from "../components/shared";
import styles from "./CreateLinkPage.module.css";

/** Создание ссылки (`/links/new`) — `POST /api/links` через `LinkForm`. */
export function CreateLinkPage() {
  return (
    <div className={styles.page}>
      <h1>Новая ссылка</h1>
      <Card padding="lg">
        <LinkForm />
      </Card>
    </div>
  );
}

export default CreateLinkPage;
