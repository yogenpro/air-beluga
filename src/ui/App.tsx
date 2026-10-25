import { useEffect, useState } from 'react';
import { loadBrowserContent } from '../content/browser';
import type { ContentLibrary } from '../content/library';
import { GameLibrary } from './GameLibrary';

type LoadState =
  | { status: 'LOADING' }
  | { status: 'ERROR' }
  | { status: 'READY'; library: ContentLibrary };

export function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'LOADING' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoadState({ status: 'LOADING' });
    loadBrowserContent().then(
      (content) => {
        if (!cancelled) setLoadState({ status: 'READY', library: content });
      },
      () => {
        if (!cancelled) setLoadState({ status: 'ERROR' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  return (
    <>
      <a className="skip-link" href="#desk">
        Skip to check-in desk
      </a>
      <main id="desk">
        <h1>Air Beluga</h1>
        <p>
          A travel-document puzzle. You decide airline acceptance; border
          admission is a separate decision.
        </p>
        {loadState.status === 'LOADING' && (
          <p role="status">Loading training content…</p>
        )}
        {loadState.status === 'ERROR' && (
          <section className="panel" role="alert">
            <h2>Unable to load training content</h2>
            <p>
              Check your connection and try again. Your saved progress has not
              been changed.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry loading
            </button>
          </section>
        )}
        {loadState.status === 'READY' && (
          <GameLibrary library={loadState.library} />
        )}
        <footer>
          <p>
            Educational puzzle; not an authoritative tool for real travel
            decisions. Verify requirements with official sources and your
            airline before travel.
          </p>
        </footer>
      </main>
    </>
  );
}
