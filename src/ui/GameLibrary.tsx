import { useEffect, useMemo, useState } from 'react';
import { DateSchema } from '../content/schemas';
import { dailyForDate, type ContentLibrary } from '../content/library';
import { createDailySession, createStageSession } from '../core/engine';
import { utcDate } from '../core/daily';
import { DailyHistory } from './DailyHistory';
import { GameDesk } from './GameDesk';

type Mode = 'STAGE' | 'DAILY' | 'RESULTS';

export function GameLibrary({ library }: { library: ContentLibrary }) {
  const content = library.current;
  const [today, setToday] = useState(() => utcDate(new Date()));
  const [mode, setMode] = useState<Mode>(() => {
    const value = new URLSearchParams(location.search).get('mode');
    return value === 'daily'
      ? 'DAILY'
      : value === 'results'
        ? 'RESULTS'
        : 'STAGE';
  });
  const [stageId, setStageId] = useState(() => {
    const requested = new URLSearchParams(location.search).get('stage');
    return (
      content.stages.find((stage) => stage.id === requested)?.id ??
      content.stages.find((stage) => stage.verificationStatus === 'VERIFIED')
        ?.id ??
      content.stages[0]!.id
    );
  });
  const [date, setDate] = useState(() => {
    const requested = new URLSearchParams(location.search).get('date');
    return DateSchema.safeParse(requested).success ? requested! : today;
  });
  useEffect(() => {
    const timer = setInterval(() => setToday(utcDate(new Date())), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set('mode', mode.toLowerCase());
    if (mode === 'STAGE') url.searchParams.set('stage', stageId);
    else url.searchParams.delete('stage');
    if (mode === 'DAILY') url.searchParams.set('date', date);
    else url.searchParams.delete('date');
    history.replaceState(null, '', url);
  }, [mode, stageId, date]);
  const daily = useMemo(() => {
    try {
      if (!DateSchema.safeParse(date).success)
        return { error: 'Choose a valid UTC date.' };
      const selected = dailyForDate(library, date);
      return (
        selected ?? {
          error: `Daily challenges begin on ${library.index.dailySchedule[0]?.from ?? 'a future content release'}. The illustrative tutorial is available in Stages.`,
        }
      );
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : 'This daily challenge is unavailable.',
      };
    }
  }, [library, date]);
  const stage = content.stages.find((item) => item.id === stageId)!;
  return (
    <>
      <nav aria-label="Game modes" className="actions modes">
        <button
          type="button"
          aria-pressed={mode === 'STAGE'}
          onClick={() => setMode('STAGE')}
        >
          Stages
        </button>
        <button
          type="button"
          aria-pressed={mode === 'DAILY'}
          onClick={() => setMode('DAILY')}
        >
          Daily challenge
        </button>
        <button
          type="button"
          aria-pressed={mode === 'RESULTS'}
          onClick={() => setMode('RESULTS')}
        >
          Daily results
        </button>
      </nav>
      {mode === 'STAGE' && (
        <>
          <label htmlFor="stage-choice">Choose a stage</label>{' '}
          <select
            id="stage-choice"
            value={stageId}
            onChange={(event) => setStageId(event.target.value)}
          >
            {[...content.stages]
              .sort(
                (a, b) =>
                  Number(b.verificationStatus === 'VERIFIED') -
                  Number(a.verificationStatus === 'VERIFIED'),
              )
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                  {item.verificationStatus === 'ILLUSTRATIVE_ONLY'
                    ? ' · Illustrative'
                    : ' · Source-reviewed'}
                </option>
              ))}
          </select>
          <GameDesk
            key={`${content.manifest.contentVersion}:${stageId}`}
            content={content}
            initialSession={createStageSession(content, stageId)}
            metadata={{
              title: stage.title,
              flightLabel: stage.flightLabel,
              departureLabel: `Departure: ${stage.scheduledDeparture.replace('T', ' ').replace('Z', ' UTC')}`,
              notice: stage.notice,
              tutorial: stage.tutorial,
            }}
          />
        </>
      )}
      {mode === 'DAILY' && (
        <>
          <h2>Daily challenge</h2>
          <p>
            Today is {today} UTC. A new daily begins at 00:00 UTC. Changing
            dates keeps your existing progress.
          </p>
          <label htmlFor="daily-date">Daily UTC date</label>{' '}
          <input
            id="daily-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          {date !== today && (
            <p>
              <button type="button" onClick={() => setDate(today)}>
                Play today's challenge
              </button>
            </p>
          )}
          {'error' in daily ? (
            <p role="status">{daily.error}</p>
          ) : (
            <>
              <p>
                Content: {daily.selection.contentVersion} · Algorithm:{' '}
                {daily.selection.dailyAlgorithmVersion}
              </p>
              <p>
                The selection date is separate from each case's authored travel
                date. Answers use the frozen rule snapshot, including when
                replayed later.
              </p>
              <GameDesk
                key={daily.selection.id}
                content={daily.content}
                initialSession={createDailySession(
                  daily.content,
                  daily.selection,
                )}
                metadata={{
                  title: `${date} UTC · Daily documents desk`,
                  flightLabel: 'Air Beluga · curated passenger queue',
                  departureLabel: `Authored travel dates: ${[...new Set(daily.selection.caseIds.map((id) => daily.content.cases.find((item) => item.id === id)!.travelDate))].join(', ')}`,
                  notice: daily.content.dailyPools.find(
                    (pool) => pool.id === daily.selection.poolId,
                  )!.notice,
                  tutorial:
                    'Every client with this UTC date, content version and algorithm gets the same ordered passenger queue. Only source-reviewed cases are selected. Your first completion is retained separately from replay progress.',
                }}
              />
            </>
          )}
        </>
      )}
      {mode === 'RESULTS' && <DailyHistory library={library} />}
    </>
  );
}
