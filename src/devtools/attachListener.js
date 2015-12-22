import domId from './id';
const localStorageId = domId;
import waitForDom from './waitForDom';
import draw from './draw';

const pressed = { a: 0, v: 0 };
const state = JSON.parse(localStorage.getItem(localStorageId) || '{}');
let shown = state.shown || false;
let tab = state.tab || 'graph';

function now() {
  return new Date().getTime();
}

function toggle() {
  shown = !shown;
  const style = document.getElementById(domId).style;
  style.display = shown ? 'block' : 'none';
  if (shown) {
    draw();
  }
  localStorage.setItem(localStorageId, JSON.stringify({ shown, tab }));
}

function maybeToggle() {
  if (pressed.v > pressed.a && pressed.v - pressed.a <= 200) {
    toggle();
  }
}

function toggleTab() {
  tab = tab === 'graph' ? 'timeline' : 'graph';
  const graphStyle = document.getElementById(domId).querySelector('#network').style;
  const timelineStyle = document.getElementById(domId).querySelector('#timeline').style;
  graphStyle.display = tab === 'graph' ? 'block' : 'none';
  timelineStyle.display = tab === 'timeline' ? 'block' : 'none';
  if (shown) {
    draw();
  }
  localStorage.setItem(localStorageId, JSON.stringify({ shown, tab }));
}

export default waitForDom(function() {
  const _s = shown;
  shown = false;
  tab = tab === 'graph' ? 'network' : 'graph';
  toggleTab();
  shown = _s;
  if (shown) {
    shown = false;
    toggle();
  }

  const switcher = document.querySelector(`#${domId} #switcher`);
  switcher.addEventListener('click', toggleTab);

  document.addEventListener('keyup', ({ keyCode }) => {
    switch (keyCode) {
      case 65:
        pressed.a = now();
        maybeToggle();
        break;
      case 86:
        pressed.v = now();
        maybeToggle();
        break;
      case 27:
        if (shown) {
          toggle();
        }
        break;
    }
  })
});
