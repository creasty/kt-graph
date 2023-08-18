import { Table } from "./util";

const AMBIGUOUS_REF_SEP = "@";

export function buildAmbiguousRef(packageName: string, refName: string) {
  return [packageName, refName].join(AMBIGUOUS_REF_SEP);
}

function parseAmbiguousRef(ambiguousRef: string) {
  const [packageName, refName] = ambiguousRef.split(AMBIGUOUS_REF_SEP, 2);
  if (!refName) return null;
  return { packageName, refName };
}

export type DependencyTableFilters = {
  include?: (ident: string) => boolean;
  unify?: (ident: string) => string;
};

export class DependencyTable {
  #table = new Table<string, Set<string>>(null, () => new Set());
  #finalized = false;
  #filterApplied = false;

  get data(): ReadonlyMap<string, ReadonlySet<string>> {
    return this.#table;
  }

  #checkFinalized(value: boolean) {
    if (this.#finalized !== value) {
      throw new Error(value ? "Not finalized" : "Already finalized");
    }
  }
  #checkFilterApplied(value: boolean) {
    if (this.#filterApplied !== value) {
      throw new Error(value ? "Filter not applied" : "Filter already applied");
    }
  }

  #addDeclaration(declIdent: string) {
    this.#table.fetch(declIdent);
  }
  addDeclaration(declIdent: string) {
    this.#checkFinalized(false);
    this.#addDeclaration(declIdent);
  }

  #addReference(declIdent: string, refIdent: string) {
    this.#table.fetch(declIdent).add(refIdent);
  }
  addReference(declIdent: string, refIdent: string) {
    this.#checkFinalized(false);
    this.#addReference(declIdent, refIdent);
  }

  #resolveAmbiguousRef(validIdentSet: Set<string> | Map<string, any>, refIdent: string) {
    const amRef = parseAmbiguousRef(refIdent);
    if (!amRef) return refIdent;

    const components = amRef.refName.split(".");
    for (let pos = components.length; pos >= 1; pos--) {
      const matchingName = [amRef.packageName, ...components.slice(0, pos)].join(".");
      const remaining = components.slice(pos);

      if (validIdentSet.has(matchingName)) {
        return [matchingName, ...remaining].join(".");
      }
    }

    return null;
  }

  finalize() {
    this.#checkFinalized(false);
    this.#finalized = true;

    const unresolvableRefs = new Set<string>();
    const table = this.#resetTable();
    for (const [declIdent, deps] of table) {
      this.#addDeclaration(declIdent);

      for (const refIdent of deps) {
        const newRefIdent = this.#resolveAmbiguousRef(table, refIdent);
        if (newRefIdent) {
          this.#addReference(declIdent, newRefIdent);
        } else {
          unresolvableRefs.add(refIdent);
        }
      }
    }

    return { unresolvableRefs };
  }

  applyFilters(f: DependencyTableFilters) {
    this.#checkFinalized(true);
    this.#checkFilterApplied(false);
    this.#filterApplied = true;

    if (f.include) {
      const table = this.#resetTable();
      for (const [declIdent, deps] of table) {
        if (!f.include(declIdent)) continue;
        this.#addDeclaration(declIdent);

        for (const refIdent of deps) {
          if (!f.include(refIdent)) continue;
          this.#addReference(declIdent, refIdent);
        }
      }
    }

    if (f.unify) {
      const table = this.#resetTable();
      for (const [declIdent, deps] of table) {
        const newDeclIdent = f.unify(declIdent);
        this.#addDeclaration(newDeclIdent);

        for (const refIdent of deps) {
          const newRefIdent = f.unify(refIdent);
          if (newRefIdent !== refIdent && newRefIdent === newDeclIdent) continue;
          this.#addReference(newDeclIdent, newRefIdent);
        }
      }
    }
  }

  #resetTable() {
    const current = this.#table;
    this.#table = new Table(null, current.initializeValue);
    return current;
  }

  loadJson(jsonString: string) {
    this.#checkFinalized(false);
    this.#finalized = true;
    this.#table = new Table(JSON.parse(jsonString, jsonReviver), this.#table.initializeValue);
  }

  toJson() {
    return JSON.stringify(this.#table, jsonReplacer, "  ");
  }
}

function jsonReviver(this: any, _key: string, value: any): any {
  if (value && typeof value === "object") {
    if (value.$type === "Map") {
      return new Map(value.value);
    }
    if (value.$type === "Set") {
      return new Set(value.value);
    }
  }
  return value;
}

function jsonReplacer(this: any, _key: string, value: any): any {
  if (value instanceof Map) {
    return {
      $type: "Map",
      value: [...value],
    };
  }
  if (value instanceof Set) {
    return {
      $type: "Set",
      value: [...value],
    };
  }
  return value;
}
