const haveChromeAgent = navigator.userAgent.indexOf('Chrome') > -1;
const haveSafariAgent = navigator.userAgent.indexOf('Safari') > -1;

const isSafari = () => {
  if (haveSafariAgent && haveChromeAgent) {
    return false;
  }

  return haveSafariAgent;
};

export const isSafariChrome = () => haveSafariAgent && haveChromeAgent;

export default isSafari;
