import { toPng } from 'html-to-image';

const messageType = 'cssbattle';

// if (event.origin.startsWith('https://codebattle.hexlet.io/games/')) {
window.addEventListener(
  'message',
  (event: MessageEvent) => {
    try {
      if (event.data.type !== 'cssbattle') {
        return;
      }

      window.parent.postMessage({ type: messageType, data: event.data }, event.origin);

      if (event.data?.userId) {
        const { bodyStr, userId } = event.data;

        document.body.innerHTML = bodyStr;

        toPng(document.body).then((dataUrl) => {
          window.parent.postMessage({ type: messageType, dataUrl, userId }, event.origin);
        });
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    }
  },
  false,
);
