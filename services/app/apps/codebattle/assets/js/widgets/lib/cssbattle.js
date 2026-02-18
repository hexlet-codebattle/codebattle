import pixelmatch from "pixelmatch";

const diffThreshold = 0.1;

const getMatchPoints = (stats, width, height) => 1 - stats / (width * height);

const getMatchPercentageText = (match) => `${(match * 100).toFixed(2)}%`;

export const matchBattlePictures = (
  firstImgDataUrl,
  secondImgDataUrl,
  targetImgDataUrl,
  width,
  height,
) => {
  // 1: Prepare canvases for pixel matching
  const firstImgCanvas = document.createElement("canvas");
  const secondImgCanvas = document.createElement("canvas");
  const targetImgCanvas = document.createElement("canvas");
  const firstDiffCanvas = document.createElement("canvas");
  const secondDiffCanvas = document.createElement("canvas");

  firstImgCanvas.width = width;
  firstImgCanvas.height = height;
  secondImgCanvas.width = width;
  secondImgCanvas.height = height;
  targetImgCanvas.width = width;
  targetImgCanvas.height = height;
  firstDiffCanvas.width = width;
  firstDiffCanvas.height = height;
  secondDiffCanvas.width = width;
  secondDiffCanvas.height = height;

  const firstContext = firstImgCanvas.getContext("2d");
  const secondContext = secondImgCanvas.getContext("2d");
  const targetContext = targetImgCanvas.getContext("2d");
  const firstDiffContext = firstDiffCanvas.getContext("2d");
  const secondDiffContext = secondDiffCanvas.getContext("2d");

  // 2: Create images from data urls and draw on canvases

  const firstImg = new Image(width, height);
  const secondImg = new Image(width, height);
  const targetImg = new Image(width, height);

  firstImg.src = firstImgDataUrl;
  secondImg.src = secondImgDataUrl;
  targetImg.src = targetImgDataUrl;

  firstContext.drawImage(firstImg, 0, 0, width, height);
  secondContext.drawImage(secondImg, 0, 0, width, height);
  targetContext.drawImage(targetImg, 0, 0, width, height);

  // 3: Pixel match players images on target

  const firstDataImg = firstContext.getImageData(0, 0, width, height);
  const secondDataImg = secondContext.getImageData(0, 0, width, height);
  const targetDataImg = targetContext.getImageData(0, 0, width, height);
  const firstDiff = firstDiffContext.createImageData(width, height);
  const secondDiff = secondDiffContext.createImageData(width, height);

  const firstStats = pixelmatch(
    firstDataImg.data,
    targetDataImg.data,
    firstDiff.data,
    width,
    height,
    { threshold: diffThreshold },
  );
  const secondStats = pixelmatch(
    secondDataImg.data,
    targetDataImg.data,
    secondDiff.data,
    width,
    height,
    { threshold: diffThreshold },
  );

  // 4: Return match statistics
  // 4.1: Get match points

  const firstMatchPoints = getMatchPoints(firstStats, width, height);
  const secondMatchPoints = getMatchPoints(secondStats, width, height);

  // 4.2: Retrive image data urls from diff canvases
  firstDiffContext.putImageData(firstDiff, 0, 0);
  secondDiffContext.putImageData(secondDiff, 0, 0);
  firstDiffContext.save();
  secondDiffContext.save();

  const firstDiffDataUrl = firstDiffCanvas.toDataURL("image/png");
  const secondDiffDataUrl = secondDiffCanvas.toDataURL("image/png");

  // 4.3: Return final result

  const result = [
    {
      match: firstMatchPoints,
      matchPercentage: getMatchPercentageText(firstMatchPoints),
      success: firstMatchPoints >= 0.9999,
      diffDataUrl: firstDiffDataUrl,

      // for debug
      imageCanvas: firstImgCanvas,
      diffCanvas: firstDiffCanvas,
    },
    {
      match: secondMatchPoints,
      matchPercentage: getMatchPercentageText(secondMatchPoints),
      success: secondMatchPoints >= 0.9999,
      diffDataUrl: secondDiffDataUrl,

      // for debug
      imageCanvas: secondImgCanvas,
      diffCanvas: secondDiffCanvas,
    },
  ];

  return {
    result,

    // for debug
    targetCanvas: targetImgCanvas,
  };
};

export default matchBattlePictures;
