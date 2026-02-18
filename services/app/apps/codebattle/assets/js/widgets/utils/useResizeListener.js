import { useCallback, useEffect } from "react";

const useResizeListener = (editor, props) => {
  const handleResize = useCallback(() => {
    if (editor) {
      editor.layout();
    }
  }, [editor]);

  useEffect(() => {
    handleResize();
  }, [props.locked, handleResize]);

  useEffect(() => {
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

  return {
    handleResize,
  };
};

export default useResizeListener;
