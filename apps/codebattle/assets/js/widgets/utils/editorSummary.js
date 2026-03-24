const defaultWindowMs = 10_000;
const defaultEventLimit = 100;

export const editorSummaryConfig = {
  eventLimit: defaultEventLimit,
  windowMs: defaultWindowMs,
};

export const createTelemetryWindow = ({ offsetMs = 0, textLength = 0, langSlug = null } = {}) => ({
  eventCount: 0,
  windowStartOffsetMs: offsetMs,
  windowEndOffsetMs: offsetMs,
  langSlug,
  keyEventCount: 0,
  printableKeyCount: 0,
  modifierShortcutCount: 0,
  copyShortcutCount: 0,
  cutShortcutCount: 0,
  pasteShortcutAttemptCount: 0,
  undoShortcutCount: 0,
  redoShortcutCount: 0,
  backspaceCount: 0,
  deleteCount: 0,
  enterCount: 0,
  tabCount: 0,
  arrowKeyCount: 0,
  pasteBlockedCount: 0,
  dropBlockedCount: 0,
  contentChangeCount: 0,
  charsInserted: 0,
  charsDeleted: 0,
  netTextDelta: 0,
  maxSingleInsertLen: 0,
  maxSingleDeleteLen: 0,
  multiCharInsertCount: 0,
  multiCharDeleteCount: 0,
  multiLineInsertCount: 0,
  largeInsertCount: 0,
  finalTextLength: textLength,
  keyDeltaSampleCount: 0,
  keyDeltaTotalMs: 0,
  minKeyDeltaMs: 0,
  maxKeyDeltaMs: 0,
  idlePauseOver2sCount: 0,
  lastKeyOffsetMs: null,
});

export const finalizeTelemetryWindow = (windowSummary) => {
  if (!windowSummary || windowSummary.eventCount <= 0) {
    return null;
  }

  return {
    eventCount: windowSummary.eventCount,
    windowStartOffsetMs: windowSummary.windowStartOffsetMs,
    windowEndOffsetMs: windowSummary.windowEndOffsetMs,
    langSlug: windowSummary.langSlug,
    keyEventCount: windowSummary.keyEventCount,
    printableKeyCount: windowSummary.printableKeyCount,
    modifierShortcutCount: windowSummary.modifierShortcutCount,
    copyShortcutCount: windowSummary.copyShortcutCount,
    cutShortcutCount: windowSummary.cutShortcutCount,
    pasteShortcutAttemptCount: windowSummary.pasteShortcutAttemptCount,
    undoShortcutCount: windowSummary.undoShortcutCount,
    redoShortcutCount: windowSummary.redoShortcutCount,
    backspaceCount: windowSummary.backspaceCount,
    deleteCount: windowSummary.deleteCount,
    enterCount: windowSummary.enterCount,
    tabCount: windowSummary.tabCount,
    arrowKeyCount: windowSummary.arrowKeyCount,
    pasteBlockedCount: windowSummary.pasteBlockedCount,
    dropBlockedCount: windowSummary.dropBlockedCount,
    contentChangeCount: windowSummary.contentChangeCount,
    charsInserted: windowSummary.charsInserted,
    charsDeleted: windowSummary.charsDeleted,
    netTextDelta: windowSummary.netTextDelta,
    maxSingleInsertLen: windowSummary.maxSingleInsertLen,
    maxSingleDeleteLen: windowSummary.maxSingleDeleteLen,
    multiCharInsertCount: windowSummary.multiCharInsertCount,
    multiCharDeleteCount: windowSummary.multiCharDeleteCount,
    multiLineInsertCount: windowSummary.multiLineInsertCount,
    largeInsertCount: windowSummary.largeInsertCount,
    finalTextLength: windowSummary.finalTextLength,
    keyDeltaSampleCount: windowSummary.keyDeltaSampleCount,
    avgKeyDeltaMs:
      windowSummary.keyDeltaSampleCount > 0
        ? Math.round(windowSummary.keyDeltaTotalMs / windowSummary.keyDeltaSampleCount)
        : 0,
    minKeyDeltaMs: windowSummary.minKeyDeltaMs,
    maxKeyDeltaMs: windowSummary.maxKeyDeltaMs,
    idlePauseOver2sCount: windowSummary.idlePauseOver2sCount,
  };
};

export const isPrintableKey = (event) =>
  typeof event.key === "string" &&
  event.key.length === 1 &&
  !event.ctrl_key &&
  !event.meta_key &&
  !event.alt_key;

export const isArrowKey = (key) =>
  key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight";

export const updateTelemetryWindow = (windowSummary, event) => {
  const nextWindow = windowSummary || createTelemetryWindow(event);

  nextWindow.eventCount += 1;
  nextWindow.windowEndOffsetMs = event.offset_ms ?? nextWindow.windowEndOffsetMs;
  nextWindow.langSlug = event.lang_slug || nextWindow.langSlug;

  if (typeof event.text_length === "number") {
    nextWindow.finalTextLength = event.text_length;
  }

  switch (event.type) {
    case "keydown": {
      nextWindow.keyEventCount += 1;

      if (isPrintableKey(event)) {
        nextWindow.printableKeyCount += 1;
      }

      if (event.ctrl_key || event.meta_key) {
        nextWindow.modifierShortcutCount += 1;

        if (event.code === "KeyC") nextWindow.copyShortcutCount += 1;
        if (event.code === "KeyX") nextWindow.cutShortcutCount += 1;
        if (event.code === "KeyV") nextWindow.pasteShortcutAttemptCount += 1;
        if (event.code === "KeyZ") nextWindow.undoShortcutCount += 1;
        if (event.code === "KeyY") nextWindow.redoShortcutCount += 1;
      }

      if (event.key === "Backspace") nextWindow.backspaceCount += 1;
      if (event.key === "Delete") nextWindow.deleteCount += 1;
      if (event.key === "Enter") nextWindow.enterCount += 1;
      if (event.key === "Tab") nextWindow.tabCount += 1;
      if (isArrowKey(event.key)) nextWindow.arrowKeyCount += 1;

      if (typeof event.offset_ms === "number") {
        if (typeof nextWindow.lastKeyOffsetMs === "number") {
          const deltaMs = Math.max(0, event.offset_ms - nextWindow.lastKeyOffsetMs);
          nextWindow.keyDeltaSampleCount += 1;
          nextWindow.keyDeltaTotalMs += deltaMs;
          nextWindow.minKeyDeltaMs =
            nextWindow.keyDeltaSampleCount === 1
              ? deltaMs
              : Math.min(nextWindow.minKeyDeltaMs, deltaMs);
          nextWindow.maxKeyDeltaMs = Math.max(nextWindow.maxKeyDeltaMs, deltaMs);

          if (deltaMs >= 2_000) {
            nextWindow.idlePauseOver2sCount += 1;
          }
        }

        nextWindow.lastKeyOffsetMs = event.offset_ms;
      }

      break;
    }

    case "paste_blocked":
      nextWindow.pasteBlockedCount += 1;
      break;

    case "drop_blocked":
      nextWindow.dropBlockedCount += 1;
      break;

    case "content_change":
      nextWindow.contentChangeCount += event.change_count || 0;
      nextWindow.charsInserted += event.inserted_chars || 0;
      nextWindow.charsDeleted += event.deleted_chars || 0;
      nextWindow.netTextDelta += event.net_text_delta || 0;
      nextWindow.maxSingleInsertLen = Math.max(
        nextWindow.maxSingleInsertLen,
        event.max_single_insert_len || 0,
      );
      nextWindow.maxSingleDeleteLen = Math.max(
        nextWindow.maxSingleDeleteLen,
        event.max_single_delete_len || 0,
      );
      nextWindow.multiCharInsertCount += event.multi_char_insert_count || 0;
      nextWindow.multiCharDeleteCount += event.multi_char_delete_count || 0;
      nextWindow.multiLineInsertCount += event.multi_line_insert_count || 0;
      nextWindow.largeInsertCount += event.large_insert_count || 0;
      break;

    default:
      break;
  }

  return nextWindow;
};
