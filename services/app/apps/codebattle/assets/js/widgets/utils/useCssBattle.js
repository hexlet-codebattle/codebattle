import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import { decompress } from 'lz-string';
import { useSelector } from 'react-redux';

import { matchBattlePictures } from '../lib/cssbattle';
import * as selectors from '../selectors';

const getIframeHtmlContent = text => `<div></div><style>${text}</style>`;
// const defaultText = '\ndiv {\n\tbackground: #F3AC3C;\n\twidth: 50px;\n\theight: 50px\n}';

const useIframes = () => {
  const leftSolutionIframe = useRef();
  const rightSolutionIframe = useRef();

  const [leftIframeLoaded, setLeftIframeLoaded] = useState(false);
  const [rightIframeLoaded, setRightIframeLoaded] = useState(false);

  const isIframesLoaded = leftIframeLoaded && rightIframeLoaded;

  const handleLoadLeftIframe = useCallback(() => {
    setLeftIframeLoaded(true);
  }, [setLeftIframeLoaded]);
  const handleLoadRightIframe = useCallback(() => {
    setRightIframeLoaded(true);
  }, [setRightIframeLoaded]);

  const result = useMemo(() => ({
    isIframesLoaded,
    leftSolutionIframe,
    rightSolutionIframe,
    handleLoadRightIframe,
    handleLoadLeftIframe,
  }), [
    isIframesLoaded,
    handleLoadLeftIframe,
    handleLoadRightIframe,
  ]);

  return result;
};

const useCssBattleStats = (
  isIframesLoaded,
  leftSolutionIframe,
  rightSolutionIframe,
) => {
  const leftImgRef = useRef();
  const rightImgRef = useRef();
  const diffImgRef = useRef();
  const targetImgRef = useRef();

  const [leftDataUrl, setLeftDataUrl] = useState();
  const [rightDataUrl, setRightDataUrl] = useState();

  const [matchStats, setMatchStats] = useState({
    status: 'loading',
    result: [{
      match: 0,
      matchPercentage: '0.00%',
      success: false,
      diffDataUrl: undefined,
    }],
  });

  const task = useSelector(selectors.gameTaskSelector);
  const leftEditor = useSelector(selectors.leftEditorSelector());
  const rightEditor = useSelector(selectors.rightEditorSelector());

  const targetDataUrl = useMemo(
    () => (task.imgDataUrl ? decompress(task.imgDataUrl) : undefined),
    [task.imgDataUrl],
  );

  const cssTextLeft = leftEditor.text;
  const cssTextRight = rightEditor.text;

  const receivedCssBattleIframeMessage = useCallback(event => {
    try {
      if (event.data?.type !== 'cssbattle' && !event.data?.dataUrl) {
        return;
      }

      if (event.data?.userId === leftEditor.userId) {
        setLeftDataUrl(event.data.dataUrl);
      }

      if (event.data?.userId === rightEditor.userId) {
        setRightDataUrl(event.data.dataUrl);
      }
    } catch (e) {
      console.error(e.message);
    }
  }, [leftEditor.userId, rightEditor.userId, setLeftDataUrl, setRightDataUrl]);

  useEffect(() => {
    if (isIframesLoaded) {
      leftSolutionIframe.current.contentWindow.postMessage({
        type: 'cssbattle',
        userId: leftEditor.userId,
        bodyStr: getIframeHtmlContent(cssTextLeft),
      });

      rightSolutionIframe.current.contentWindow.postMessage({
        type: 'cssbattle',
        userId: rightEditor.userId,
        bodyStr: getIframeHtmlContent(cssTextRight),
      });
    }
  }, [
    cssTextLeft,
    cssTextRight,
    leftSolutionIframe,
    rightSolutionIframe,
    leftEditor.userId,
    rightEditor.userId,
    isIframesLoaded,
  ]);

  useEffect(() => {
    if (leftDataUrl && rightDataUrl && targetDataUrl) {
      setMatchStats(state => ({ ...state, status: 'process' }));

      const intervalId = setInterval(() => {
        try {
          if (!targetImgRef.current) {
            return;
          }

          const stats = matchBattlePictures(
            leftDataUrl,
            rightDataUrl,
            targetDataUrl,
            targetImgRef.current.naturalWidth,
            targetImgRef.current.naturalHeight,
          );
          setMatchStats({ ...stats, status: 'ready' });
          clearInterval(intervalId);
        } catch (e) {
          console.error(e);
          setMatchStats(state => ({ ...state, status: 'loading' }));
          console.warn('images not ready for pixel matching');
        }
      }, 1000);

      return () => {
        clearInterval(intervalId);
      };
    }

    if (!targetDataUrl) {
      setMatchStats(state => ({ ...state, status: 'targetIsEmpty' }));

      return () => { };
    }

    return () => { };
  }, [leftDataUrl, rightDataUrl, targetDataUrl, setMatchStats]);

  useEffect(() => {
    if (leftImgRef.current) {
      leftImgRef.current.src = leftDataUrl;
    }
  }, [leftDataUrl]);

  useEffect(() => {
    if (rightImgRef.current) {
      rightImgRef.current.src = rightDataUrl;
    }
  }, [rightDataUrl]);

  useEffect(() => {
    if (targetImgRef.current && targetDataUrl) {
      targetImgRef.current.src = targetDataUrl;
    }
  }, [targetDataUrl]);

  useEffect(() => {
    if (diffImgRef.current && matchStats.diffDataUrl) {
      diffImgRef.current.src = matchStats.diffDataUrl;
    }
  }, [matchStats.diffDataUrl]);

  useEffect(() => {
    window.addEventListener(
      'message',
      receivedCssBattleIframeMessage,
      false,
    );

    return () => {
      window.removeEventListener(
        'message',
        receivedCssBattleIframeMessage,
      );
    };
  }, [receivedCssBattleIframeMessage]);

  const result = useMemo(() => ({
    matchStats,
    targetImgRef,
    diffImgRef,
    leftImgRef,
    rightImgRef,
  }), [
    matchStats,
  ]);

  return result;
};

const useCssBattle = () => {
  const {
    isIframesLoaded,
    leftSolutionIframe,
    rightSolutionIframe,
    handleLoadLeftIframe,
    handleLoadRightIframe,
  } = useIframes();
  const {
    matchStats,
    diffImgRef,
    targetImgRef,
    leftImgRef,
    rightImgRef,
  } = useCssBattleStats(
    isIframesLoaded,
    leftSolutionIframe,
    rightSolutionIframe,
  );

  return {
    matchStats,
    diffImgRef,
    targetImgRef,
    leftImgRef,
    rightImgRef,
    leftSolutionIframe,
    rightSolutionIframe,
    handleLoadLeftIframe,
    handleLoadRightIframe,
  };
};

export default useCssBattle;
