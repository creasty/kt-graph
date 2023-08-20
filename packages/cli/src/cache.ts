import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { DependencyTable } from "@kt-graph/core";
import { createHash } from "crypto";
import yaml from "js-yaml";
import { z } from "zod";
import { Config, ProjectName } from "config";

const TABLE_VERSION = 1;

const CachedTable = z.object({
  version: z.number().int().positive().lte(TABLE_VERSION),
  createdAt: z.string().datetime({ offset: true }),
  data: z.record(z.string(), z.array(z.string())),
});
type CachedTable = z.infer<typeof CachedTable>;

export function saveTable(config: Config, projectName: ProjectName, table: DependencyTable) {
  const cachedTable: CachedTable = {
    version: TABLE_VERSION,
    createdAt: new Date().toISOString(),
    data: {},
  };
  for (const [key, value] of table.data) {
    cachedTable.data[key] = Array.from(value);
  }

  const rawData = yaml.dump(cachedTable);

  const file = getPathForProject(config, projectName);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, rawData);
}

export function loadTable(config: Config, projectName: ProjectName) {
  const filePath = getPathForProject(config, projectName);
  if (!existsSync(filePath)) {
    return null;
  }
  const data = readFileSync(filePath, "utf8");
  const cachedTable = CachedTable.parse(yaml.load(data));

  const tableData = new Map<string, Set<string>>();
  for (const [key, value] of Object.entries(cachedTable.data)) {
    tableData.set(key, new Set(value));
  }

  return {
    filePath,
    version: cachedTable.version,
    createdAt: cachedTable.createdAt,
    table: new DependencyTable(tableData),
  };
}

function getCacheFilePath(...paths: string[]) {
  return path.join(homedir(), ".kt-graph", "cache", ...paths);
}

function getPathForProject(config: Config, projectName: ProjectName) {
  return getCacheFilePath(sha1(config.$configDir), `table.${projectName}.yml`);
}

function sha1(data: string) {
  const hash = createHash("sha1");
  hash.update(data);
  return hash.digest("hex");
}
