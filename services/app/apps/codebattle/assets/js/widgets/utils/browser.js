const isSafari = () => {
  const haveChromeAgent = navigator.userAgent.indexOf('Chrome') > -1;
  const haveSafariAgent = navigator.userAgent.indexOf('Safari') > -1;

  if (haveSafariAgent && haveChromeAgent) {
    return false;
  }

  return haveSafariAgent;
};

export const isMacintosh = () => navigator.userAgent.indexOf('Macintosh; Intel Mac OS') > -1;

export default isSafari;
