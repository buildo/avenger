import hook from './id';
import draw from './draw';
import waitForDom from './waitForDom';

export default waitForDom(function setUniverse(universe) {
  window[hook] = {
    ...(window[hook] || {}),
    universe
  };
  draw();
});
