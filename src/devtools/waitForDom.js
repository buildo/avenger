import hook from './id';

export default function waitForDom(fn) {
  return function(...args) {
    console.log('>> waitForDom', ...args);
    if (typeof window !== 'undefined') {
      if (window[hook] && window[hook].domLoaded) {
        console.log('>> already loaded');
        fn(...args);
      } else {
        window.addEventListener('load', () => {
          console.log('>> loaded');
          window[hook] = {
            ...window[hook],
            domLoaded: true
          };
          fn(...args);
        });
      }
    }
  };
}
