import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { parseArgs } from 'node:util';
import { loadContentFromDisk } from './lib/content';
import {
  createStageSession,
  getPassengerView,
  reduceSession,
} from '../src/core/engine';
import type { Action } from '../src/core/actions';

async function main() {
  const { values } = parseArgs({
    options: {
      auto: { type: 'boolean', default: false },
      stage: { type: 'string', default: '001-sfo' },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) {
    console.log('npm run play:stage -- [--stage 001-sfo] [--auto]');
    console.log('--auto plays the authored solutions and prints spoilers.');
    return;
  }
  const content = await loadContentFromDisk();
  const stage = content.stages.find((item) => item.id === values.stage);
  if (!stage) throw new Error(`Unknown stage ${values.stage}`);
  console.log(`${stage.title}\n${stage.flightLabel}\n${stage.notice}`);
  console.log(
    'Educational puzzle; not an authoritative tool for real travel decisions. Verify requirements with official sources and your airline before travel.',
  );
  let state = createStageSession(content, stage.id);
  const dispatch = (action: Action) => {
    state = reduceSession(state, action, content);
    if (action.type === 'SUBMIT_DECISION') {
      const result = state.results.at(-1)!;
      console.log(JSON.stringify(result, null, 2));
      const snapshot = content.ruleSnapshots.find(
        (item) => item.id === result.ruleSnapshotId,
      )!;
      for (const rule of snapshot.rules.filter((item) =>
        result.ruleIds.includes(item.id),
      )) {
        console.log(`${rule.id}: ${rule.body}`);
        for (const source of rule.sources)
          console.log(`${source.publisher}: ${source.url}`);
      }
    }
  };
  if (values.auto) {
    console.log('AUTO PLAYBACK — authored solutions follow.');
    while (state.status !== 'COMPLETED') {
      const item = content.cases.find(
        (entry) => entry.id === state.caseIds[state.passengerIndex],
      )!;
      for (const questionId of item.resolution.paths[0]!.requiredQuestionIds) {
        dispatch({ type: 'ASK_QUESTION', questionId });
      }
      dispatch({
        type: 'SUBMIT_DECISION',
        decision: item.resolution.expectedDecision,
      });
      dispatch({ type: 'NEXT_PASSENGER' });
    }
  } else {
    const terminal = createInterface({ input: stdin, output: stdout });
    const help =
      'Commands: inspect <document-id>, ask <question-id>, rule [id or search], check-in, deny, escalate, next, help, quit';
    console.log(help);
    try {
      while (state.status !== 'COMPLETED') {
        if (state.status === 'IN_PROGRESS') {
          console.log(
            JSON.stringify(getPassengerView(state, content), null, 2),
          );
        }
        const input = (await terminal.question('Air Beluga > ')).trim();
        const [command, ...args] = input.split(/\s+/);
        const argument = args.join(' ');
        if (command === 'quit') return;
        try {
          switch (command) {
            case 'help':
              console.log(help);
              break;
            case 'inspect':
              dispatch({ type: 'INSPECT_DOCUMENT', documentId: argument });
              break;
            case 'ask':
              dispatch({ type: 'ASK_QUESTION', questionId: argument });
              break;
            case 'check-in':
              dispatch({ type: 'SUBMIT_DECISION', decision: 'CHECK_IN' });
              break;
            case 'deny':
              dispatch({ type: 'SUBMIT_DECISION', decision: 'DENY' });
              break;
            case 'escalate':
              dispatch({ type: 'SUBMIT_DECISION', decision: 'ESCALATE' });
              break;
            case 'next':
              dispatch({ type: 'NEXT_PASSENGER' });
              break;
            case 'rule': {
              const item = content.cases.find(
                (entry) => entry.id === state.caseIds[state.passengerIndex],
              )!;
              const snapshot = content.ruleSnapshots.find(
                (entry) => entry.id === item.ruleSnapshotId,
              )!;
              const rules = snapshot.rules.filter((rule) =>
                `${rule.id} ${rule.title} ${rule.body}`
                  .toLowerCase()
                  .includes(argument.toLowerCase()),
              );
              if (!rules.length) console.log('No matching rules.');
              for (const rule of rules) {
                console.log(`${rule.id}: ${rule.title}\n${rule.body}`);
                if (state.status === 'IN_PROGRESS')
                  dispatch({ type: 'OPEN_RULE', ruleId: rule.id });
              }
              break;
            }
            default:
              console.log(help);
          }
        } catch (error) {
          console.log(error instanceof Error ? error.message : String(error));
        }
      }
    } finally {
      terminal.close();
    }
  }
  console.log(
    `Stage complete: ${state.results.filter((result) => result.correct).length}/${state.results.length} correct; ${state.totalScore} points.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
