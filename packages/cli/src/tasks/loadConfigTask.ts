import { Config, loadConfig, locateConfigFile, Project } from "config";
import { ListrTask, ListrDefaultRenderer } from "listr2";

export type LoadConfigTaskContext = Partial<{
  // Output
  config: Config;
  project: Project;
}>;

export function loadConfigTask(params: {
  workingDir: string;
  projectName?: string;
}): ListrTask<LoadConfigTaskContext, ListrDefaultRenderer> {
  return {
    title: "Load config",
    task: async (ctx, task) => {
      const filePath = locateConfigFile(params.workingDir);
      if (!filePath) {
        throw new Error("Config file not found");
      }
      task.output = `Found: ${filePath}`;

      const config = loadConfig(filePath);
      ctx.config = config;

      return task.newListr({
        title: `Read project '${params.projectName}'`,
        enabled: () => Boolean(params.projectName),
        task: async (ctx, task) => {
          void task;
          const project = config.projects.get(params.projectName!);
          if (!project) {
            const validProjectNames = Array.from(config.projects.keys());
            throw new Error(
              `Could not find a project '${params.projectName}'.\nValid names are: ${validProjectNames.join(", ")}`
            );
          }
          ctx.project = project;
        },
      });
    },
  };
}
