import domId from './id';
import waitForDom from './waitForDom';

const createElement = (id, styles, html) => {
  const el = document.createElement('div');
  el.id = id;
  const style = el.style;
  Object.keys(styles).forEach(k => {
    style[k] = styles[k];
  });
  el.innerHTML = html || '';
  return el;
};

export default waitForDom(function createContainer() {
  const container = createElement(domId, {
    display: 'none',
    position: 'absolute',
    top: '10px', right: '10px', bottom: '10px', left: '10px',
    zIndex: 9999,
    backgroundColor: 'white',
    opacity: '0.9'
  });
  const wrapper = createElement('wrapper', {
    position: 'relative',
    height: '100%',
    width: '100%',
    paddingBottom: '300px'
  });
  const switcher = createElement('switcher', {
    cursor: 'pointer'
  }, 'toggle graph/timeline');
  const networkContainer = createElement('network', {
    height: '100%',
    width: '100%'
  });
  const timelineContainer = createElement('timeline', {
    width: '100%',
    height: '100%'
  });
  wrapper.appendChild(switcher);
  wrapper.appendChild(timelineContainer);
  wrapper.appendChild(networkContainer);
  container.appendChild(wrapper);
  document.body.appendChild(container);
});
