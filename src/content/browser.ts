import { loadLibrary } from './library';

/** Only static JSON is fetched, once when the desk loads. */
export function loadBrowserContent() {
  return loadLibrary(async (path) => {
    const response = await fetch(`${import.meta.env.BASE_URL}data/${path}`, {
      cache: 'no-cache',
    });
    if (!response.ok)
      throw new Error(`Unable to read ${path} (${response.status})`);
    return response.json() as Promise<unknown>;
  });
}
