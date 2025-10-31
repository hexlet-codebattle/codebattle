import { readFileSync, writeFileSync } from 'fs';
import pixelmatch from 'pixelmatch';
import LZString from 'lz-string';
import nodeHtmlToImage from 'node-html-to-image';
import { PNG } from 'pngjs';

const executionResult = [];

const toOut = ({ type = '', value = '', time = 0 }) => {
  executionResult.push(
    {
      type,
      time,
      value: JSON.stringify(value),
    }
  );
};

const getMatchPoints = (stats, width, height) => (
  1 - stats / (width * height)
);

const getMatchPercentageText = match => (
  `${(match * 100).toFixed(2)}%`
);

const run = function run(args = []) {
  const now = performance.now();

  const solution = readFileSync('./check/solution.html', 'utf-8');
  const target = readFileSync('./check/target.html', 'utf-8');

  const mime = 'image/png';
  const encoding = 'base64';

  return Promise.all([
    nodeHtmlToImage({
      html: solution,
      content: {
        output: "./check/solution.png",
      },
    }),
    nodeHtmlToImage({
      html: target,
      content: {
        output: "./check/target.png",
      },
    }),
  ]).then(([solutionImageBuffer, targetImageBuffer]) => {
    const solutionImg = PNG.sync.read(solutionImageBuffer);
    const targetImg = PNG.sync.read(targetImageBuffer);

    const { width: solutionWidth, height: solutionHeight } = solutionImg;
    const { width, height } = targetImg;

    const isMissmatchSizes = width !== solutionWidth || height !== solutionHeight;

    const diff = new PNG({ width, height });

    const solutionImgDatUri = `data:${mime};${encoding},${solutionImageBuffer.toString(encoding)}`;
    const targetImgDataUri = `data:${mime};${encoding},${targetImageBuffer.toString(encoding)}`;

    try {
      const stats = pixelmatch(solutionImg.data, targetImg.data, diff.data, width, height, { threshold: 0.1 });
      const match = getMatchPoints(stats, width, height);
      const matchPercentage = getMatchPercentageText(match);
      const diffBuffer = PNG.sync.write(diff);

      writeFileSync('./check/diff.png', diffBuffer);
      const diffDataUri = `data:${mime};${encoding},${diffBuffer.toString(encoding)}`;

      toOut({
        type: 'result',
        time: (performance.now() - now).toFixed(5),
        value: {
          match,
          matchPercentage,
          isMissmatchSizes,
          width,
          height,
          solutionDataUri: LZString.compress(solutionImgDatUri),
          targetDataUri: LZString.compress(targetImgDataUri),
          diffDataUri: LZString.compress(diffDataUri),
          message: '',
        },
      });
    } catch (e) {
      toOut({
        type: 'error',
        time: (performance.now() - now).toFixed(5),
        value: {
          match: 0,
          matchPercentage: '0.00%',
          isMissmatchSizes,
          width,
          height,
          solutionDataUri: LZString.compress(solutionImgDatUri),
          targetDataUri: LZString.compress(targetImgDataUri),
          message: e.toString(),
        },
      });
    }
  }).catch(err => {
    toOut({
      type: 'error',
      time: 0,
      value: err.toString(),
    });
  });
}

run().then(() => {
  console.log(JSON.stringify(executionResult));
})
