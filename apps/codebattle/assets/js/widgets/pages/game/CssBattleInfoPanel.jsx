import React, { memo, useCallback } from "react";

import cn from "classnames";
import { compress } from "lz-string";
import { useDispatch } from "react-redux";

import Loading from "@/components/Loading";
import * as roomActions from "@/middlewares/Room";
import useCssBattle from "@/utils/useCssBattle";
import useHover from "@/utils/useHover";

const frameStyle = {
  minWidth: 300,
  minHeight: 200,
};

const statusTitleMap = {
  targetIsEmpty: "Create a new css task",
  targetIsInvalid: "Error",
  process: "Processing...",
  loading: "Loading...",
};

function CssBattleInfoPanel() {
  const dispatch = useDispatch();

  const [ref, hovered] = useHover();

  const {
    matchStats,
    leftImgRef,
    rightImgRef,
    targetImgRef,
    leftSolutionIframe,
    rightSolutionIframe,
    handleLoadLeftIframe,
    handleLoadRightIframe,
  } = useCssBattle();

  const handleClick = useCallback(() => {
    const compressedDataUrl = compress(leftImgRef.current?.src);
    dispatch(roomActions.changeTaskImgDataUrl(compressedDataUrl));
  }, [leftImgRef, dispatch]);

  const isLoading = matchStats.status === "loading";
  const showStats = hovered && matchStats.result[0]?.success && matchStats.status !== "process";
  const showTargetControls = ["targetIsEmpty", "targetIsInvalid"].includes(matchStats.status);

  return (
    <div className="card cb-card border-0 h-100">
      <div className="d-flex flex-column flex-xl-row flex-lg-row flex-md-row justify-content-between px-3 py-3">
        <div className="card cb-card d-flex flex-column mx-1" style={frameStyle}>
          <div className="h-100 position-relative">
            {isLoading && (
              <div className="position-absolute cb-opacity-50 d-flex justify-content-center align-items-center h-100 w-100">
                <Loading size="adaptive" />
              </div>
            )}
            <div className={cn("position-relative h-100 w-100", { "cb-opacity-25": isLoading })}>
              <img
                alt=""
                title="Right editor solution picture"
                className={cn("w-100 h-100 position-absolute", "cb-opacity-05", {
                  invisible: isLoading,
                })}
                ref={rightImgRef}
              />
              <img
                alt=""
                title="Left editor solution picture"
                className={cn(
                  "w-100 h-100 position-absolute",
                  // 'cb-opacity-75',
                  { invisible: isLoading },
                )}
                ref={leftImgRef}
              />
              <iframe
                src="/cssbattle/builder"
                title="left editor solution"
                className="border-0 w-100 h-100 position-absolute invisible"
                ref={leftSolutionIframe}
                onLoad={handleLoadLeftIframe}
              />
              <iframe
                src="/cssbattle/builder"
                title="right editor solution"
                className="border-0 w-100 h-100 position-absolute invisible"
                ref={rightSolutionIframe}
                onLoad={handleLoadRightIframe}
              />
            </div>
          </div>
        </div>
        <div ref={ref} className="card cb-card d-flex flex-column mx-1" style={frameStyle}>
          <div className="h-100 position-relative">
            <div
              className={cn(
                "h-100 w-100 d-flex position-absolute flex-column justify-content-center align-items-center",
                { invisible: !showTargetControls },
              )}
            >
              <span className="mb-2">{statusTitleMap[matchStats.status]}</span>
              <button
                type="button"
                className="btn btn-secondary cb-btn-secondary cb-rounded"
                onClick={handleClick}
              >
                Save current img
              </button>
            </div>
            <div
              className={cn(
                "h-100 w-100 d-flex position-absolute text-center",
                "flex-column justify-content-center align-items-center",
                "text-muted h1 cb-opacity-75",
                { invisible: !showStats || showTargetControls || isLoading },
              )}
            >
              {matchStats.result[0]?.success ? "100%" : matchStats.result[0]?.matchPercentage}
            </div>
            <img
              alt=""
              title="target solution picture"
              className={cn("w-100 h-100 position-absolute", {
                "cb-opacity-50 ": showStats,
                invisible: showTargetControls || isLoading,
              })}
              ref={targetImgRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(CssBattleInfoPanel);
