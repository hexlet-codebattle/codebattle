export default imagePath => new URL(`../../../static/images/${imagePath}`, import.meta.url).href;
