import { useEffect, useState } from 'react';
import { loadBrowserContent } from '../content/browser';
import type { ContentLibrary } from '../content/library';
import { GameLibrary } from './GameLibrary';
import { BelugaMark } from './Icons';
type LoadState =
  | { status: 'LOADING' }
  | { status: 'ERROR' }
  | { status: 'READY'; library: ContentLibrary };
export function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'LOADING' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
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
      <div className="airport-scene" aria-hidden="true" />
      <a className="skip-link" href="#desk">
        Skip to game
      </a>
      {loadState.status === 'READY' ? (
        <GameLibrary library={loadState.library} />
      ) : (
        <main id="desk" className="loading-screen">
          <BelugaMark />
          <h1>Air Beluga</h1>
          {loadState.status === 'LOADING' ? (
            <p role="status">Getting your desk ready…</p>
          ) : (
            <section className="panel" role="alert">
              <h2>Unable to load training content</h2>
              <p>
                Check your connection and try again. Your saved progress has not
                been changed.
              </p>
              <button
                type="button"
                className="button-primary"
                onClick={() => {
                  setLoadState({ status: 'LOADING' });
                  setAttempt((value) => value + 1);
                }}
              >
                Retry loading
              </button>
            </section>
          )}
        </main>
      )}
      <footer className="site-footer">
        <span>Made for curious minds. Played at your own pace.</span>
        <details>
          <summary>About this game</summary>
          <p>
            Educational puzzle; not an authoritative tool for real travel
            decisions. Airline acceptance is separate from border admission.
            Verify requirements with official sources and your airline before
            travel. Progress is saved in this browser.
          </p>
        </details>
      </footer>
    </>
  );
}
