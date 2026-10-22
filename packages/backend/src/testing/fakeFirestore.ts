import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";

type Data = Record<string, unknown>;
type Store = Map<string, Map<string, Data>>;

type DocRef = { kind: "doc"; collection: string; id: string };
type Filter = { field: string; op: "==" | "in"; value: unknown };
type QueryState = {
  kind: "query";
  collection: string;
  filters: Filter[];
  order: { field: string; direction: "asc" | "desc" }[];
  limit?: number;
};

/**
 * An in-memory stand-in for the parts of Firestore the services use, so
 * service tests run without the emulator. Transactions buffer their writes
 * and drop them if the callback throws, and they refuse a read after a write,
 * as Firestore does.
 *
 * Anything else throws. If an implementation needs more of the API, add it
 * here rather than working around it.
 */
export function fakeFirestore(seed: Record<string, Record<string, Data>> = {}) {
  const store: Store = new Map(
    Object.entries(seed).map(([name, docs]) => [
      name,
      new Map(Object.entries(docs).map(([id, data]) => [id, clone(data)])),
    ]),
  );
  const docsIn = (collection: string) => {
    let docs = store.get(collection);
    if (!docs) {
      docs = new Map();
      store.set(collection, docs);
    }
    return docs;
  };

  const snapshotOf = (ref: DocRef) => {
    const data = docsIn(ref.collection).get(ref.id);
    return {
      id: ref.id,
      ref: docRef(ref.collection, ref.id),
      exists: data !== undefined,
      data: () => (data === undefined ? undefined : clone(data)),
      get: (field: string) => data?.[field],
    };
  };

  const runQuery = (query: QueryState) => {
    let ids = [...docsIn(query.collection).entries()]
      .filter(([, data]) =>
        query.filters.every(({ field, op, value }) =>
          op === "=="
            ? data[field] === value
            : (value as unknown[]).includes(data[field]),
        ),
      )
      .map(([id]) => id);
    for (const { field, direction } of query.order.toReversed()) {
      const docs = docsIn(query.collection);
      ids = ids.toSorted((a, b) => {
        const left = docs.get(a)?.[field] as number | string;
        const right = docs.get(b)?.[field] as number | string;
        if (left === right) return 0;
        const ascending = left < right ? -1 : 1;
        return direction === "asc" ? ascending : -ascending;
      });
    }
    if (query.limit !== undefined) ids = ids.slice(0, query.limit);
    const docs = ids.map((id) =>
      snapshotOf({ kind: "doc", collection: query.collection, id }),
    );
    return { docs, size: docs.length, empty: docs.length === 0 };
  };

  const read = (target: DocRef | QueryState) =>
    target.kind === "doc" ? snapshotOf(target) : runQuery(target);

  type Write = () => void;
  const writes = {
    set: (ref: DocRef, data: Data, options?: { merge?: boolean }) => () => {
      const docs = docsIn(ref.collection);
      const base = options?.merge ? (docs.get(ref.id) ?? {}) : {};
      docs.set(ref.id, { ...base, ...clone(data) });
    },
    create: (ref: DocRef, data: Data) => () => {
      const docs = docsIn(ref.collection);
      if (docs.has(ref.id)) {
        throw new Error(`ALREADY_EXISTS: ${ref.collection}/${ref.id}`);
      }
      docs.set(ref.id, clone(data));
    },
    update: (ref: DocRef, data: Data) => () => {
      const docs = docsIn(ref.collection);
      const current = docs.get(ref.id);
      if (!current) throw new Error(`NOT_FOUND: ${ref.collection}/${ref.id}`);
      docs.set(ref.id, { ...current, ...clone(data) });
    },
    delete: (ref: DocRef) => () => {
      docsIn(ref.collection).delete(ref.id);
    },
  };

  function docRef(collection: string, id: string) {
    const ref: DocRef = { kind: "doc", collection, id };
    return {
      ...ref,
      path: `${collection}/${id}`,
      get: () => Promise.resolve(read(ref)),
      set: (data: Data, options?: { merge?: boolean }) =>
        Promise.resolve(writes.set(ref, data, options)()),
      create: (data: Data) => Promise.resolve(writes.create(ref, data)()),
      update: (data: Data) => Promise.resolve(writes.update(ref, data)()),
      delete: () => Promise.resolve(writes.delete(ref)()),
    };
  }

  function queryRef(state: QueryState) {
    return {
      ...state,
      where: (field: string, op: string, value: unknown) => {
        if (op !== "==" && op !== "in") {
          throw new Error(`fakeFirestore does not support the ${op} filter.`);
        }
        return queryRef({
          ...state,
          filters: [...state.filters, { field, op, value }],
        });
      },
      orderBy: (field: string, direction: "asc" | "desc" = "asc") =>
        queryRef({ ...state, order: [...state.order, { field, direction }] }),
      limit: (limit: number) => queryRef({ ...state, limit }),
      get: () => Promise.resolve(runQuery(state)),
    };
  }

  const db = {
    collection: (name: string) => ({
      ...queryRef({ kind: "query", collection: name, filters: [], order: [] }),
      // Like Firestore, `doc()` with no id picks a fresh one.
      doc: (id: string = randomUUID()) => docRef(name, id),
    }),
    getAll: (...refs: DocRef[]) => Promise.resolve(refs.map(snapshotOf)),
    async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      const pending: Write[] = [];
      const guardRead = () => {
        if (pending.length > 0) {
          throw new Error(
            "Firestore transactions require all reads to be executed before all writes.",
          );
        }
      };
      const queue =
        <A extends unknown[]>(write: (...args: A) => Write) =>
        (...args: A) => {
          pending.push(write(...args));
          return tx;
        };
      const tx = {
        get: (target: DocRef | QueryState) => {
          guardRead();
          return Promise.resolve(read(target));
        },
        getAll: (...refs: DocRef[]) => {
          guardRead();
          return Promise.resolve(refs.map(snapshotOf));
        },
        set: queue(writes.set),
        create: queue(writes.create),
        update: queue(writes.update),
        delete: queue(writes.delete),
      };
      const result = await fn(tx);
      for (const write of pending) write();
      return result;
    },
  };

  return {
    db: db as unknown as Firestore,
    /** The stored document, or `undefined` if there is none. */
    doc: (collection: string, id: string) => {
      const data = docsIn(collection).get(id);
      return data === undefined ? undefined : clone(data);
    },
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
