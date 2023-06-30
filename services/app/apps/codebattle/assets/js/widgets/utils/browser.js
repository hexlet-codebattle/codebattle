const isSafari = () => {
  const haveChromeAgent = navigator.userAgent.indexOf('Chrome') > -1;
  const havaSafariAgent = navigator.userAgent.indexOf('Safari') > -1;

  if (havaSafariAgent && haveChromeAgent) {
    return false;
  }

  return havaSafariAgent;
};

export default isSafari;
