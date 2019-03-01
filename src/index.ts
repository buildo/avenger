export { cache, compose, product, observe } from './observe';

// const a = (input: string) => (
//   console.log('>> fa'),
//   taskEither.of<string, number>(input.length).map(l => {
//     console.log('>>> inner');
//     return l;
//   })
// );
// const a = (input: string) => (console.log('>> fa'), fromLeft<string, number>(input));
// const a = () => (console.log('>> fa'), fromLeft<string, number>('fasda'));
// const ca = cache(a, ({ updated }) => Date.now() - updated.getTime() < 100);
// observe(ca, 'test').subscribe(console.log.bind(console));
// ca('test').run(); // 1
// ca('test').run(); // 1
// ca('test').run(); // 1
// ca('test').run(); // 1
// setTimeout(() => ca('test').run(), 50); // 1
// setTimeout(() => ca('test').run(), 200); // 2
// setTimeout(() => ca('test').run(), 250); // 2
// setTimeout(() => ca('test').run(), 290); // 2
// setTimeout(() => ca('test').run(), 350); // 3
// const b = (input: number) => (
//   console.log('>> fb'), taskEither.of<string, string>(input.toLocaleString())
// );
// const ab = compose(
//   cache(a),
//   cache(b)
// );
// const ab = product(cache(a), cache(b));
// observe(ab, 'test').subscribe(console.log.bind(console));
// observe(ab, ['test', 4]).subscribe(console.log.bind(console));
// ab('test').run();
// setTimeout(() => ab('test').run(), 300);
// ab(['test', 4]).run();
// setTimeout(() => ab(['test', 4]).run(), 300);
