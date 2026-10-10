import { getPlaybookStartTime, hasReplayableRecords, minify } from '../widgets/lib/player';

describe('playbook replay helpers', () => {
  test('a playbook with only chat records has nothing to replay', () => {
    const records = [
      minify({ type: 'join_chat', time: 1_000 }),
      minify({ type: 'chat_message', time: 3_000 }),
      minify({ type: 'timeout', time: 600_000 }),
    ];

    expect(hasReplayableRecords(records)).toBe(false);
    expect(hasReplayableRecords([])).toBe(false);
    expect(hasReplayableRecords(undefined)).toBe(false);
  });

  test('editor updates and checks are replayable', () => {
    expect(hasReplayableRecords([minify({ type: 'update_editor_data', time: 1 })])).toBe(true);
    expect(hasReplayableRecords([minify({ type: 'check_complete', time: 1 })])).toBe(true);
  });

  test('the timeline starts at the game start, not at the first record', () => {
    const records = [minify({ type: 'join_chat', time: 2_500 })];

    expect(getPlaybookStartTime([{ time: 1_200 }, { time: 1_000 }], records)).toBe(1_000);
    expect(getPlaybookStartTime([], records)).toBe(2_500);
    expect(getPlaybookStartTime(undefined, [])).toBeNull();
  });
});
