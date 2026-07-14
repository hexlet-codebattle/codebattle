import { useCallback, useEffect } from 'react';

// editor is a Monaco editor instance; we only touch layout() here.
const useResizeListener = (
  editor: { layout: () => void } | null | undefined,
  props: { locked?: boolean },
) => {
  const handleResize = useCallback(() => {
    if (editor) {
      editor.layout();
    }
  }, [editor]);

  useEffect(() => {
    handleResize();
  }, [props.locked, handleResize]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  return {
    handleResize,
  };
};

export default useResizeListener;
