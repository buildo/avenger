const t = require('tcomb');

module.exports = {
  Worklist: t.struct({
    _id: t.Str,
    name: t.Str
  }),
  Sample: t.struct({
    _id: t.Str,
    valid: t.Bool
  }),
  Test: t.struct({
    _id: t.Str,
    blocked: t.Bool,
    _testKindId: t.Str
  }),
  TestKind: t.struct({
    _id: t.Str,
    material: t.Str
  })
};
