import expect from 'expect';
import queries from '../fixtures/queries';
import build from '../../src/build';

describe('build', () => {
  const { A, B, C, D, E, F, G, H } = queries();
  const all = { A, B, C, D, E, F, G, H };

  it('should work for a loner', () => {
    const built = build({ H }, all);

    expect(Object.keys(built).length).toBe(1);

    expect(built.H).toExist();
    expect(built.H.query).toBe(H);
    expect(built.H.parents).toEqual({});
    expect(built.H.children).toEqual({});

  });

  it('should work for a |', () => {
    const built = build({ A, B }, all);

    expect(Object.keys(built).length).toBe(3);

    expect(built.A).toExist();
    expect(built.A.query).toBe(A);
    expect(built.A.parents).toEqual({});
    expect(built.A.children.B).toExist();
    expect(built.A.children.B.query).toBe(B);

    expect(built.F).toExist();
    expect(built.F.query).toBe(F);
    expect(built.F.parents).toEqual({});
    expect(built.F.children.B).toExist();
    expect(built.F.children.B.query).toBe(B);

    expect(built.B).toExist();
    expect(built.B.query).toBe(B);
    expect(built.B.children).toEqual({});
    expect(built.B.parents.A).toExist();
    expect(built.B.parents.A.query).toBe(A);
    expect(built.B.parents.F).toExist();
    expect(built.B.parents.F.query).toBe(F);

  });

  it('should work for a /\\', () => {
    const built = build({ A, B, C }, all);

    expect(Object.keys(built).length).toBe(4);

    expect(built.A).toExist();
    expect(built.A.query).toBe(A);
    expect(built.A.parents).toEqual({});
    expect(built.A.children.B).toExist();
    expect(built.A.children.B.query).toBe(B);
    expect(built.A.children.C).toExist();
    expect(built.A.children.C.query).toBe(C);

    expect(built.F).toExist();
    expect(built.F.query).toBe(F);
    expect(built.F.parents).toEqual({});
    expect(built.F.children.B).toExist();
    expect(built.F.children.B.query).toBe(B);

    expect(built.C).toExist();
    expect(built.C.query).toBe(C);
    expect(built.C.children).toEqual({});
    expect(built.C.parents.A).toExist();
    expect(built.C.parents.A.query).toBe(A);

    expect(built.B).toExist();
    expect(built.B.query).toBe(B);
    expect(built.B.children).toEqual({});
    expect(built.B.parents.A).toExist();
    expect(built.B.parents.A.query).toBe(A);
    expect(built.B.parents.F).toExist();
    expect(built.B.parents.F.query).toBe(F);

  });

  it('should work for a ◇', () => {
    const built = build({ A, C, D, E }, all);

    expect(Object.keys(built).length).toBe(6);

    expect(built.A).toExist();
    expect(built.A.query).toBe(A);
    expect(built.A.parents).toEqual({});
    expect(built.A.children.B).toExist();
    expect(built.A.children.B.query).toBe(B);
    expect(built.A.children.C).toExist();
    expect(built.A.children.C.query).toBe(C);

    expect(built.F).toExist();
    expect(built.F.query).toBe(F);
    expect(built.F.parents).toEqual({});
    expect(built.F.children.B).toExist();
    expect(built.F.children.B.query).toBe(B);

    expect(built.C).toExist();
    expect(built.C.query).toBe(C);
    expect(built.C.children.E).toExist();
    expect(built.C.children.E.query).toBe(E);
    expect(built.C.parents.A).toExist();
    expect(built.C.parents.A.query).toBe(A);

    expect(built.B).toExist();
    expect(built.B.query).toBe(B);
    expect(built.B.children.D).toExist();
    expect(built.B.children.D.query).toBe(D);
    expect(built.B.parents.A).toExist();
    expect(built.B.parents.A.query).toBe(A);
    expect(built.B.parents.F).toExist();
    expect(built.B.parents.F.query).toBe(F);

    expect(built.E).toExist();
    expect(built.E.query).toBe(E);
    expect(built.E.parents.C).toExist();
    expect(built.E.parents.C.query).toBe(C);
    expect(built.E.parents.D).toExist();
    expect(built.E.parents.D.query).toBe(D);
    expect(built.E.children).toEqual({});

  });

  it('should work for A, B, C, D, E, F, G', () => {
    const built = build({ A, B, C, D, E, F, G }, all);

    expect(Object.keys(built).length).toBe(7);

    expect(built.A).toExist();
    expect(built.A.query).toBe(A);
    expect(built.A.parents).toEqual({});
    expect(built.A.children.B).toExist();
    expect(built.A.children.B.query).toBe(B);
    expect(built.A.children.C).toExist();
    expect(built.A.children.C.query).toBe(C);

    expect(built.B).toExist();
    expect(built.B.query).toBe(B);
    expect(built.B.parents.A).toExist();
    expect(built.B.parents.A.query).toBe(A);
    expect(built.B.parents.F).toExist();
    expect(built.B.parents.F.query).toBe(F);
    expect(built.B.children.D).toExist();
    expect(built.B.children.D.query).toBe(D);

    expect(built.C).toExist();
    expect(built.C.query).toBe(C);
    expect(built.C.parents.A).toExist();
    expect(built.C.parents.A.query).toBe(A);
    expect(built.C.children.E).toExist();
    expect(built.C.children.E.query).toBe(E);

    expect(built.D).toExist();
    expect(built.D.query).toBe(D);
    expect(built.D.parents.A).toExist();
    expect(built.D.parents.A.query).toBe(A);
    expect(built.D.children.E).toExist();
    expect(built.D.children.E.query).toBe(E);

    expect(built.E).toExist();
    expect(built.E.query).toBe(E);
    expect(built.E.parents.C).toExist();
    expect(built.E.parents.C.query).toBe(C);
    expect(built.E.parents.D).toExist();
    expect(built.E.parents.D.query).toBe(D);
    expect(built.E.children).toEqual({});

    expect(built.F).toExist();
    expect(built.F.query).toBe(F);
    expect(built.F.parents).toEqual({});
    expect(built.F.children.B).toExist();
    expect(built.F.children.B.query).toBe(B);

    expect(built.G).toExist();
    expect(built.G.query).toBe(G);
    expect(built.G.parents.D).toExist();
    expect(built.G.parents.D.query).toBe(D);
    expect(built.G.children).toEqual({});

  });

  it('should reuse refs', () => {
    const built = build({ A, B, C, D, E, F, G }, all);

    Object.keys(built).forEach(k => {
      Object.keys(built[k].parents).forEach(p => {
        expect(built[k].parents[p]).toBe(built[p]);
      });
      Object.keys(built[k].children).forEach(c => {
        expect(built[k].children[c]).toBe(built[c]);
      });
    });
  });
});