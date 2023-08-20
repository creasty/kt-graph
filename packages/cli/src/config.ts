import { existsSync, readFileSync } from "fs";
import yaml from "js-yaml";
import path from "path";
import { z } from "zod";

const CONFIG_VERSION = 1;
const CONFIG_FILE_NAME = "kt-graph.yml";

const ProjectName = z.string().refine((name) => /^[a-zA-Z0-9_-]+$/.test(name));
export type ProjectName = z.infer<typeof ProjectName>;

const Project = z.object({
  $name: ProjectName.default("_"),
  files: z.array(z.string().nonempty()).nonempty(),
  includePatterns: z.array(z.string().nonempty()).nonempty(),
  unifyRules: z.array(z.tuple([z.string().nonempty(), z.string()])).optional(),
});
export type Project = z.infer<typeof Project>;

const Config = z.object({
  $configDir: z.string().default(""),
  version: z.number().int().positive().lte(CONFIG_VERSION),
  projects: z.record(ProjectName, Project).transform((projects) => {
    const map = new Map<ProjectName, Project>();
    for (const [name, project] of Object.entries(projects)) {
      project.$name = name;
      map.set(name, project);
    }
    return map;
  }),
});
export type Config = z.infer<typeof Config>;

export function loadConfig(filePath: string): Config {
  const rawData = readFileSync(filePath, "utf8");
  const config = Config.parse(yaml.load(rawData));
  config.$configDir = path.dirname(filePath);
  return config;
}

export function locateConfigFile(baseDir: string) {
  while (baseDir && baseDir !== "/") {
    const filePath = path.resolve(baseDir, CONFIG_FILE_NAME);
    if (existsSync(filePath)) {
      return filePath;
    }
    baseDir = path.dirname(baseDir);
  }
  return null;
}
