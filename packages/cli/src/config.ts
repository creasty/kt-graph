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
  includePatterns: z.array(z.string().nonempty()).optional(),
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

export function loadConfig(workingDir: string): Config {
  const loc = locateConfigFile(workingDir);
  if (!loc) {
    console.error("Config file not found");
    process.exit(1);
  }
  const rawData = readFileSync(loc.path, "utf8");
  const config = Config.parse(yaml.load(rawData));
  config.$configDir = loc.dir;
  return config;
}

function locateConfigFile(baseDir: string) {
  while (baseDir && baseDir !== "/") {
    const configFilePath = path.resolve(baseDir, CONFIG_FILE_NAME);
    if (existsSync(configFilePath)) {
      return { dir: baseDir, path: configFilePath };
    }
    baseDir = path.dirname(baseDir);
  }
  return null;
}

export function fetchProject(config: Config, projectName: ProjectName): Project {
  const project = config.projects.get(projectName);
  if (!project) {
    console.error(`Could not find project '${projectName}' in the config.`);
    console.error("Valid project names are", config.projects.keys());
    process.exit(1);
  }
  return project;
}
