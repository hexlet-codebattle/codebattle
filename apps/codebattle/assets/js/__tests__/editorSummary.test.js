import {
  createTelemetryWindow,
  editorSummaryConfig,
  finalizeTelemetryWindow,
  updateTelemetryWindow,
} from "../widgets/utils/editorSummary";

describe("editorSummary", () => {
  test("starts a new window and aggregates keydown metrics", () => {
    let windowSummary = createTelemetryWindow({ offsetMs: 0, textLength: 0, langSlug: "js" });

    windowSummary = updateTelemetryWindow(windowSummary, {
      type: "keydown",
      key: "a",
      code: "KeyA",
      offset_ms: 100,
      text_length: 1,
      ctrl_key: false,
      meta_key: false,
      alt_key: false,
    });

    windowSummary = updateTelemetryWindow(windowSummary, {
      type: "keydown",
      key: "Backspace",
      code: "Backspace",
      offset_ms: 2_300,
      text_length: 0,
      ctrl_key: false,
      meta_key: false,
      alt_key: false,
    });

    const summary = finalizeTelemetryWindow(windowSummary);

    expect(summary.eventCount).toBe(2);
    expect(summary.windowStartOffsetMs).toBe(0);
    expect(summary.windowEndOffsetMs).toBe(2_300);
    expect(summary.keyEventCount).toBe(2);
    expect(summary.printableKeyCount).toBe(1);
    expect(summary.backspaceCount).toBe(1);
    expect(summary.keyDeltaSampleCount).toBe(1);
    expect(summary.avgKeyDeltaMs).toBe(2_200);
    expect(summary.minKeyDeltaMs).toBe(2_200);
    expect(summary.maxKeyDeltaMs).toBe(2_200);
    expect(summary.idlePauseOver2sCount).toBe(1);
    expect(summary.finalTextLength).toBe(0);
  });

  test("tracks shortcuts and navigation keys", () => {
    let windowSummary = null;

    windowSummary = updateTelemetryWindow(windowSummary, {
      type: "keydown",
      key: "v",
      code: "KeyV",
      offset_ms: 100,
      text_length: 10,
      ctrl_key: true,
      meta_key: false,
      alt_key: false,
    });

    windowSummary = updateTelemetryWindow(windowSummary, {
      type: "keydown",
      key: "ArrowLeft",
      code: "ArrowLeft",
      offset_ms: 150,
      text_length: 10,
      ctrl_key: false,
      meta_key: false,
      alt_key: false,
    });

    const summary = finalizeTelemetryWindow(windowSummary);

    expect(summary.modifierShortcutCount).toBe(1);
    expect(summary.pasteShortcutAttemptCount).toBe(1);
    expect(summary.arrowKeyCount).toBe(1);
  });

  test("aggregates content changes and large inserts", () => {
    let windowSummary = null;

    windowSummary = updateTelemetryWindow(windowSummary, {
      type: "content_change",
      offset_ms: 500,
      lang_slug: "js",
      text_length: 75,
      change_count: 2,
      inserted_chars: 84,
      deleted_chars: 9,
      net_text_delta: 75,
      max_single_insert_len: 61,
      max_single_delete_len: 3,
      multi_char_insert_count: 3,
      multi_char_delete_count: 1,
      multi_line_insert_count: 1,
      large_insert_count: 1,
    });

    const summary = finalizeTelemetryWindow(windowSummary);

    expect(summary.contentChangeCount).toBe(2);
    expect(summary.charsInserted).toBe(84);
    expect(summary.charsDeleted).toBe(9);
    expect(summary.netTextDelta).toBe(75);
    expect(summary.maxSingleInsertLen).toBe(61);
    expect(summary.maxSingleDeleteLen).toBe(3);
    expect(summary.multiCharInsertCount).toBe(3);
    expect(summary.multiCharDeleteCount).toBe(1);
    expect(summary.multiLineInsertCount).toBe(1);
    expect(summary.largeInsertCount).toBe(1);
    expect(summary.finalTextLength).toBe(75);
  });

  test("counts blocked paste and drop attempts", () => {
    let windowSummary = null;

    windowSummary = updateTelemetryWindow(windowSummary, {
      type: "paste_blocked",
      offset_ms: 100,
      lang_slug: "js",
      text_length: 5,
    });

    windowSummary = updateTelemetryWindow(windowSummary, {
      type: "drop_blocked",
      offset_ms: 120,
      lang_slug: "js",
      text_length: 5,
    });

    const summary = finalizeTelemetryWindow(windowSummary);

    expect(summary.pasteBlockedCount).toBe(1);
    expect(summary.dropBlockedCount).toBe(1);
  });

  test("returns null when finalizing an empty window", () => {
    expect(finalizeTelemetryWindow(null)).toBe(null);
    expect(finalizeTelemetryWindow(createTelemetryWindow())).toBe(null);
  });

  test("exports the flush thresholds", () => {
    expect(editorSummaryConfig.windowMs).toBe(10_000);
    expect(editorSummaryConfig.eventLimit).toBe(100);
  });
});
