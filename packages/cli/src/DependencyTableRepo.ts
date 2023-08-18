import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { DependencyTable } from "@kt-graph/core";
import { createHash } from "crypto";

export class DependencyTableRepo {
  #dir: string;

  constructor() {
    this.#dir = path.join(homedir(), ".kotlin-class-graph");
  }

  #makeCacheDir() {
    mkdirSync(this.#dir, { recursive: true });
  }

  #getPath(cacheKeyDir: string) {
    const cacheKey = sha1(path.resolve(cacheKeyDir));
    return path.join(this.#dir, cacheKey);
  }

  save(cacheKeyDir: string, table: DependencyTable) {
    const data = table.toJson();
    this.#makeCacheDir();
    writeFileSync(this.#getPath(cacheKeyDir), data);
  }

  find(cacheKeyDir: string): DependencyTable | null {
    const table = new DependencyTable();
    try {
      const data = readFileSync(this.#getPath(cacheKeyDir), "utf8");
      table.loadJson(data);
      return table;
    } catch (e) {
      return null;
    }
  }
}

function sha1(data: string) {
  const hash = createHash("sha1");
  hash.update(data);
  return hash.digest("hex");
}
