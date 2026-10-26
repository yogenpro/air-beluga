import { useEffect, useMemo, useState } from 'react';
import { DateSchema } from '../content/schemas';
import { dailyForDate, type ContentLibrary } from '../content/library';
import { createDailySession, createStageSession } from '../core/engine';
import { utcDate } from '../core/daily';
import { browserStorage, restoreSessionProgress } from '../storage/progress';
import { DailyHistory } from './DailyHistory';
import { GameDesk } from './GameDesk';
import { BelugaMark, Icon } from './Icons';
type Mode = 'HOME' | 'STAGE' | 'TRAINING' | 'DAILY' | 'RESULTS';
interface Route {
  mode: Mode;
  stageId: string;
  date: string;
}
function readRoute(): Route {
  const params = new URLSearchParams(location.search);
  const value = params.get('mode')?.toUpperCase();
  const mode =
    value && ['STAGE', 'TRAINING', 'DAILY', 'RESULTS'].includes(value)
      ? (value as Mode)
      : 'HOME';
  const date = params.get('date');
  return {
    mode,
    stageId: params.get('stage') ?? '',
    date: DateSchema.safeParse(date).success ? date! : utcDate(new Date()),
  };
}
export function displayDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
}
function getDaily(library: ContentLibrary, date: string) {
  try {
    if (!DateSchema.safeParse(date).success)
      return { error: 'Choose a valid UTC date.' };
    return (
      dailyForDate(library, date) ?? {
        error: `Daily shifts begin on ${library.index.dailySchedule[0]?.from ?? 'a future date'}. You can visit Training in the meantime.`,
      }
    );
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'This daily shift is unavailable.',
    };
  }
}
export function GameLibrary({ library }: { library: ContentLibrary }) {
  const content = library.current;
  const [today, setToday] = useState(() => utcDate(new Date()));
  const [route, setRoute] = useState(readRoute);
  const { mode, stageId, date } = route;
  useEffect(() => {
    const timer = setInterval(() => setToday(utcDate(new Date())), 60_000);
    const onPop = () => setRoute(readRoute());
    window.addEventListener('popstate', onPop);
    return () => {
      clearInterval(timer);
      window.removeEventListener('popstate', onPop);
    };
  }, []);
  function navigate(next: Partial<Route> & { mode: Mode }) {
    const updated = { ...route, ...next };
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    if (updated.mode !== 'HOME')
      url.searchParams.set('mode', updated.mode.toLowerCase());
    if (updated.mode === 'STAGE' && updated.stageId)
      url.searchParams.set('stage', updated.stageId);
    if (updated.mode === 'DAILY') url.searchParams.set('date', updated.date);
    history.pushState(null, '', url);
    setRoute(updated);
    window.scrollTo({ top: 0 });
  }
  const daily = useMemo(() => getDaily(library, date), [library, date]);
  const todaysDaily = getDaily(library, today);
  const todaysSession =
    'error' in todaysDaily
      ? null
      : createDailySession(todaysDaily.content, todaysDaily.selection);
  const savedToday =
    todaysSession && !('error' in todaysDaily)
      ? restoreSessionProgress(
          browserStorage(),
          todaysDaily.content,
          todaysSession,
        ).session
      : null;
  const todayAction =
    savedToday?.status === 'COMPLETED'
      ? 'View shift report'
      : savedToday
        ? 'Continue shift'
        : 'Open shift briefing';
  const training = content.stages.find(
    (item) => item.verificationStatus === 'ILLUSTRATIVE_ONLY',
  );
  const stage =
    mode === 'TRAINING'
      ? training
      : content.stages.find((item) => item.id === stageId);
  const goHome = () => navigate({ mode: 'HOME' });
  const openToday = () => navigate({ mode: 'DAILY', date: today });
  return (
    <>
      <header className="site-header">
        <button
          type="button"
          className="brand"
          onClick={goHome}
          aria-label="Air Beluga · Back to terminal"
        >
          <BelugaMark />
          <span>AIR BELUGA</span>
        </button>
        <nav aria-label="Game modes" className="main-nav">
          <button
            type="button"
            aria-current={mode === 'DAILY' ? 'page' : undefined}
            onClick={() => navigate({ mode: 'DAILY' })}
          >
            Daily shift
          </button>
          <button
            type="button"
            aria-current={mode === 'STAGE' ? 'page' : undefined}
            onClick={() => navigate({ mode: 'STAGE', stageId: '' })}
          >
            Practice shifts
          </button>
          {training && (
            <button
              type="button"
              aria-current={mode === 'TRAINING' ? 'page' : undefined}
              onClick={() => navigate({ mode: 'TRAINING' })}
            >
              Training
            </button>
          )}
        </nav>
        <button
          type="button"
          className="history-link"
          onClick={() => navigate({ mode: 'RESULTS' })}
        >
          <Icon name="history" />
          <span>Shift history</span>
        </button>
      </header>
      <main
        id="desk"
        className={mode === 'HOME' ? 'terminal-home' : 'workspace-page'}
      >
        {mode === 'HOME' ? (
          <>
            <div className="home-heading">
              <p className="eyebrow">
                <span className="status-light" /> Your counter is waiting
              </p>
              <h1>
                AIR <span>BELUGA</span>
              </h1>
              <p className="home-tagline">Every journey starts at your desk.</p>
              <p className="home-description">
                A daily check-in puzzle. A few passengers.
                <br />A world of things to figure out.
              </p>
            </div>
            <div className="terminal-menu">
              <button
                type="button"
                className="daily-card"
                onClick={openToday}
                aria-label={`Today's shift · ${todayAction}`}
              >
                <span className="card-topline">
                  <span className="eyebrow">
                    <Icon name="ticket" /> DAILY DEPARTURE
                  </span>
                  <span>{displayDate(today)}</span>
                </span>
                <span className="daily-card-body">
                  <span>
                    <span className="card-title">Today’s shift</span>
                    <span className="card-description">
                      Different passengers. One desk. Your call.
                    </span>
                  </span>
                  <span className="daily-count">
                    <strong>{todaysSession?.caseIds.length ?? '—'}</strong>
                    <span>passengers</span>
                  </span>
                </span>
                <span className="card-cta">
                  {todayAction}
                  <Icon name="arrow" />
                </span>
              </button>
              <button
                type="button"
                className="mode-card practice-card"
                onClick={() => navigate({ mode: 'STAGE', stageId: '' })}
              >
                <Icon name="bag" />
                <span className="card-title">Practice shifts</span>
                <span className="card-description">
                  Get a little more worldly.
                </span>
                <Icon name="arrow" className="card-arrow" />
              </button>
              {training && (
                <button
                  type="button"
                  className="mode-card training-card"
                  onClick={() => navigate({ mode: 'TRAINING' })}
                >
                  <Icon name="book" />
                  <span className="card-title">Training</span>
                  <span className="card-description">
                    First day? We’ll show you around.
                  </span>
                  <Icon name="arrow" className="card-arrow" />
                </button>
              )}
              <p className="menu-note">
                <Icon name="clock" /> No timer. Take your time.
                <span>New shift at 00:00 UTC</span>
              </p>
            </div>
            {'error' in todaysDaily && (
              <p className="notice home-notice" role="status">
                {todaysDaily.error}
              </p>
            )}
            <p className="terminal-caption">
              <span className="status-light" /> AIR BELUGA TERMINAL
              <span>GOOD JOURNEYS START WITH GOOD QUESTIONS</span>
            </p>
          </>
        ) : (
          <>
            <button className="back-link" type="button" onClick={goHome}>
              <Icon name="back" /> Back to terminal
            </button>
            {mode === 'RESULTS' ? (
              <DailyHistory library={library} />
            ) : mode === 'DAILY' ? (
              <>
                <div className="page-heading daily-page-heading">
                  <div>
                    <p className="eyebrow">THE DAILY DESK</p>
                    <h1>{date === today ? 'Today’s shift' : 'Daily shift'}</h1>
                    <p>
                      One queue, shared by everyone. A fresh start each day.
                    </p>
                  </div>
                  <div className="date-choice">
                    <label htmlFor="daily-date">Shift date · UTC</label>
                    <input
                      id="daily-date"
                      aria-label="Daily UTC date"
                      type="date"
                      value={date}
                      onChange={(event) =>
                        navigate({ mode: 'DAILY', date: event.target.value })
                      }
                    />
                    <p>Today is {today} UTC</p>
                  </div>
                </div>
                {date !== today && (
                  <p className="archive-notice">
                    You’re visiting a previous or upcoming shift.{' '}
                    <button
                      type="button"
                      className="text-button"
                      onClick={openToday}
                    >
                      Play today's challenge
                    </button>
                  </p>
                )}
                {'error' in daily ? (
                  <p className="panel" role="status">
                    {daily.error}
                  </p>
                ) : (
                  <GameDesk
                    key={daily.selection.id}
                    content={daily.content}
                    initialSession={createDailySession(
                      daily.content,
                      daily.selection,
                    )}
                    onExit={goHome}
                    metadata={{
                      title: 'Daily documents desk',
                      flightLabel: 'Air Beluga · curated passenger queue',
                      departureLabel: `Travel date: ${[...new Set(daily.selection.caseIds.map((id) => daily.content.cases.find((item) => item.id === id)!.travelDate))].join(', ')}`,
                      notice: daily.content.dailyPools.find(
                        (pool) => pool.id === daily.selection.poolId,
                      )!.notice,
                      kind: 'DAILY',
                      airport: [
                        ...new Set(
                          daily.selection.caseIds.map(
                            (id) =>
                              daily.content.cases.find(
                                (item) => item.id === id,
                              )!.itinerary[0]!.from,
                          ),
                        ),
                      ].join(' / '),
                      tutorial:
                        'Welcome to your shift. Read each passenger’s itinerary, inspect their documents, and ask a good question when something is missing. Everyone gets the same queue. Your first completed result is kept on this device.',
                    }}
                  />
                )}
              </>
            ) : stage ? (
              <>
                <div className="page-heading">
                  <p className="eyebrow">
                    {stage.historical
                      ? 'A DAY IN THE PAST'
                      : stage.verificationStatus === 'ILLUSTRATIVE_ONLY'
                        ? 'WELCOME ABOARD'
                        : 'A LITTLE PRACTICE GOES A LONG WAY'}
                  </p>
                  <h1>
                    {stage.historical
                      ? 'Historical shift'
                      : stage.verificationStatus === 'ILLUSTRATIVE_ONLY'
                        ? 'First day at the desk'
                        : 'Practice shift'}
                  </h1>
                  <p>
                    {stage.historical
                      ? 'Turn back the clock. The rules at this desk belong to its travel date.'
                      : stage.verificationStatus === 'ILLUSTRATIVE_ONLY'
                        ? 'Learn the ropes, one passenger at a time.'
                        : 'Settle in and work through a handpicked queue.'}
                  </p>
                </div>
                <GameDesk
                  key={`${content.manifest.contentVersion}:${stage.id}`}
                  content={content}
                  initialSession={createStageSession(content, stage.id)}
                  onExit={goHome}
                  metadata={{
                    title: stage.title,
                    flightLabel: stage.flightLabel,
                    departureLabel: `Departure: ${stage.scheduledDeparture.replace('T', ' ').replace('Z', ' UTC')}`,
                    notice: stage.notice,
                    tutorial: stage.tutorial,
                    kind:
                      stage.verificationStatus === 'ILLUSTRATIVE_ONLY'
                        ? 'TRAINING'
                        : 'PRACTICE',
                    airport: stage.departureAirport,
                    historical: stage.historical,
                  }}
                />
              </>
            ) : (
              <>
                <div className="page-heading">
                  <p className="eyebrow">MAKE YOURSELF AT HOME</p>
                  <h1>Practice shifts</h1>
                  <p>
                    Familiarize yourself with a destination. Every passenger has
                    a story to work out.
                  </p>
                </div>
                <div className="shift-catalog">
                  {content.stages
                    .filter((item) => item.verificationStatus === 'VERIFIED')
                    .map((item) => (
                      <button
                        type="button"
                        className="catalog-card"
                        key={item.id}
                        onClick={() =>
                          navigate({ mode: 'STAGE', stageId: item.id })
                        }
                      >
                        <span className="catalog-route">
                          <span>{item.departureAirport}</span>
                          <Icon name="plane" />
                          <span>
                            {
                              content.cases
                                .find(
                                  (passenger) =>
                                    passenger.id === item.caseIds[0],
                                )!
                                .itinerary.at(-1)!.to
                            }
                          </span>
                        </span>
                        <span className="eyebrow">
                          {item.historical
                            ? `HISTORICAL · ${item.scheduledDeparture.slice(0, 10)}`
                            : 'SOURCE-REVIEWED'}{' '}
                          · {item.caseIds.length} PASSENGERS
                        </span>
                        <span className="card-title">{item.title}</span>
                        <span className="card-description">
                          {item.historical
                            ? 'COVID-era reports, laboratory checks, and a clock that matters.'
                            : 'Passports, permits, and asking the right questions.'}
                        </span>
                        <span className="card-cta">
                          Open shift briefing
                          <Icon name="arrow" />
                        </span>
                      </button>
                    ))}
                </div>
                <p className="catalog-note">
                  <Icon name="globe" /> More complex journeys will arrive as new
                  shifts are written and reviewed.
                </p>
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
