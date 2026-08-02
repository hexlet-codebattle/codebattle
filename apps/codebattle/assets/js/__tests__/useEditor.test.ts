import { act, renderHook } from '@testing-library/react';

import useEditor from '../widgets/utils/useEditor';

vi.mock('../widgets/utils/useCursorUpdates', () => ({ default: () => {} }));
vi.mock('../widgets/utils/useEditorCursor', () => ({ default: () => {} }));
vi.mock('../widgets/utils/useResizeListener', () => ({ default: () => {} }));

describe('useEditor', () => {
  it('uses the latest code check callback for Ctrl+Enter', () => {
    const actions: Array<{ id: string; run: () => void }> = [];
    const domNode = document.createElement('div');
    const editor = {
      addAction: vi.fn((action) => actions.push(action)),
      focus: vi.fn(),
      getDomNode: () => domNode,
      getOptions: () => ({ readOnly: false }),
      onDidChangeModelContent: vi.fn(),
      updateOptions: vi.fn(),
    };
    const monaco = {
      editor: { defineTheme: vi.fn() },
      KeyCode: { Enter: 3, KEY_M: 4 },
      KeyMod: { CtrlCmd: 1 },
    };
    const checkResult = vi.fn();

    const { result, rerender } = renderHook(
      ({ onCheck }: { onCheck?: () => void }) =>
        useEditor({
          allowClipboard: true,
          checkResult: onCheck,
          editable: true,
        }),
      { initialProps: { onCheck: undefined as (() => void) | undefined } },
    );

    act(() => result.current.handleEditorDidMount(editor, monaco));
    rerender({ onCheck: checkResult });

    const checkAction = actions.find(({ id }) => id === 'codebattle-check-keys');
    act(() => checkAction?.run());

    expect(checkAction).toBeDefined();
    expect(checkResult).toHaveBeenCalledOnce();
  });
});
