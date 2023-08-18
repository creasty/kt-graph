import { Table } from "./util";

type ReadonlyDependencyTable = ReadonlyMap<string, ReadonlySet<string>>;

type Node = {
  id: string;
  matching: boolean;
};

type Edge = {
  from: string;
  to: string;
  inverse: boolean;
};

export class DependencyGraph {
  #table: ReadonlyDependencyTable;

  #calculated = false;
  #matchingIdentSet = new Set<string>();
  #nodes = new Set<string>();
  #edges = new Map<string, Edge>();

  constructor(tableData: ReadonlyDependencyTable) {
    this.#table = tableData;
  }

  #checkCalculated(value: boolean) {
    if (this.#calculated !== value) {
      throw new Error(value ? "Not calculated" : "Already calculated");
    }
  }

  calculate(params: { query?: RegExp; exclude?: RegExp; forwardDepth: number; inverseDepth: number }) {
    this.#checkCalculated(false);
    this.#calculated = true;

    const allIdentSet = new Set<string>();
    const inverseTable = new Table<string, Set<string>>(null, () => new Set());
    for (const [ident, deps] of this.#table) {
      allIdentSet.add(ident);
      for (const dep of deps) {
        allIdentSet.add(dep);
        inverseTable.fetch(dep).add(ident);
      }
    }

    for (const ident of allIdentSet) {
      if (params.exclude?.test(ident)) continue;
      if (params.query && !params.query.test(ident)) continue;
      this.#matchingIdentSet.add(ident);
    }

    if (this.#matchingIdentSet.size !== allIdentSet.size) {
      const recurse = recurseFactory({
        nodes: this.#nodes,
        edges: this.#edges,
        exclude: params.exclude,
      });
      for (const ident of this.#matchingIdentSet) {
        recurse(false, this.#table, ident, params.forwardDepth);
        recurse(true, inverseTable, ident, params.inverseDepth);
      }
    } else {
      this.#nodes = allIdentSet;
      for (const [ident, deps] of this.#table) {
        for (const dep of deps) {
          const pair = [ident, dep];
          const key = pair.join(" -> ");
          if (this.#edges.has(key)) continue;
          this.#edges.set(key, {
            from: pair[0],
            to: pair[1],
            inverse: false,
          });
        }
      }
    }

    return {
      matchingNodesCount: this.#matchingIdentSet.size,
      nodesCount: this.#nodes.size,
      edgesCount: this.#edges.size,
    };
  }

  *nodes(): Generator<Node> {
    this.#checkCalculated(true);

    for (const node of this.#nodes) {
      const matching = this.#matchingIdentSet?.has(node);
      yield { id: node, matching };
    }
  }

  *edges(): Generator<Edge> {
    this.#checkCalculated(true);

    for (const edge of this.#edges.values()) {
      yield edge;
    }
  }
}

function recurseFactory(params: { nodes: Set<string>; edges: Map<string, Edge>; exclude?: RegExp }) {
  const recurse = (inverse: boolean, table: ReadonlyDependencyTable, ident: string, maxDepth: number) => {
    if (params.exclude?.test(ident)) return;

    params.nodes.add(ident);

    const deps = table.get(ident);
    if (!deps) return;

    for (const dep of deps) {
      params.nodes.add(dep);

      const pair = inverse ? [dep, ident] : [ident, dep];
      const key = pair.join(" -> ");

      const existing = params.edges.get(key);
      if (existing) {
        existing.inverse = existing.inverse && inverse;
      } else {
        params.edges.set(key, {
          from: pair[0],
          to: pair[1],
          inverse,
        });
      }

      if (maxDepth > 0) {
        recurse(inverse, table, dep, maxDepth - 1);
      }
    }
  };
  return recurse;
}
