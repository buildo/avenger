import vis from 'vis';
// import groupBy from 'lodash/array/groupBy';
import hook from './id';
const domId = hook;
import waitForDom from './waitForDom';

let network;
let timeline;

export default waitForDom(function draw() {
  if (typeof window !== 'undefined') {
    const universe = window[hook].universe;
    const container = document.getElementById(domId);
    const events = window[hook].events;

    if (!container || !universe || !events) {
      return;
    }

    // draw network

    const meta = events[events.length -1].value.__meta;

    const networkContainer = container.querySelector('#network');

    const color = ({ loading = false, cache = false, error = false }) => loading ? 'blue' : cache ? 'green' : error ? 'red' : 'grey';

    const nodes = new vis.DataSet(Object.keys(universe).map(id => ({
      id, label: id, color: meta[id] ? color(meta[id]) : 'white'
    })));

    const edges = new vis.DataSet(Object.keys(universe).map(id => ({
      from: id, to: Object.keys(universe[id].parents)
    })).reduce((edges, { from, to: tos }) => [
      ...edges,
      ...tos.map(to => ({ from, to }))
    ], []));

    if (network) {
      network.setData({ nodes, edges });
    } else {
      network = new vis.Network(networkContainer, { nodes, edges }, {
        nodes: { borderWidth: 2 },
        interaction: { hover: true },
        edges: {
          // physics: false
          arrows: 'to'
        },
        nodes: {
          // fixed: true
          color: 'white'
        },
        layout: {
          hierarchical: {
            enabled: true,
            direction: 'DU',
            sortMethod: 'directed'
          }
        }
      });
    }

    // draw timeline

    const timelineContainer = container.querySelector('#timeline');

    const start = events[0].time;
    const end = events[events.length - 1].time;

    const qs = Object.keys(events[events.length - 1].value.__meta);
    const loadingRanges = qs.map(q => {
      const start = events
        .filter(({ value: { __meta } }) => __meta[q] && !!__meta[q].loading)[0];
      const end = events
        .filter(({ time }) => start && time > start.time)
        .filter(({ value: { __meta } }) => __meta[q] && !__meta[q].loading)[0];
        console.log('>> loading range', q, start, end);
      return { q, range: [start, end] };
    }).filter(({ range: [,end] }) => !!end).map(({ q, range: [start, end] }) => ({
      type: 'loading',
      timelineType: 'range',
      value: end.value,
      start: start.time,
      time: start.time,
      end: end.time,
      name: 'loading',
      content: `loading ${q}`
    }));

    console.log('>> loadingRanges', loadingRanges);

    const items = events.concat(loadingRanges).map(({
      type, name, value, start, end, time, timelineType, content
    }) => ({
      id: (start || time) + name + JSON.stringify(value),
      start: start || time,
      end: end || undefined,
      type: timelineType || 'point',
      content: content || undefined
    })).map(({ start: s, end: e, ...more }) => ({
      ...more,
      start: s - start,
      end: e - start
    }));

    if (timeline) {
      timeline.destroy();
    }

    timeline = new vis.Timeline(timelineContainer, items, {
      start: 0,
      end: end - start,
      // stack: false,
      showCurrentTime: false,
      showMajorLabels: false
    });
  }
});
