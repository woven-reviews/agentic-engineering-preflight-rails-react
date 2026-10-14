import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

type Health = {
  status: string;
  database: string;
};

function App() {
  const [health, setHealth] = React.useState<Health | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/v1/health/db")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<Health>;
      })
      .then(setHealth)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Unknown error"),
      );
  }, []);

  return (
    <main>
      <section>
        <p className="eyebrow">Rails + React environment preflight</p>
        <h1>{health ? "✅ Stack is up" : error ? "Stack check failed" : "Checking stack…"}</h1>
        {health && <p className="status">database: {health.database}</p>}
        {error && <p className="error">{error}</p>}
        <p className="detail">
          This page reached Rails through Vite, and Rails completed a real PostgreSQL round trip.
        </p>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
