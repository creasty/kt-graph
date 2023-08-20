import { DependencyTable } from "@kt-graph/core";
import { loadTable } from "cache";
import { Config, Project } from "config";
import { ListrTask, ListrDefaultRenderer } from "listr2";
import { analyzeProjectTask } from "./analyzeProjectTask";
import { saveTableTask } from "./saveTableTask";

export type LoadTableTaskContext = Partial<{
  // Input
  config: Config;
  project: Project;

  // Output
  table?: DependencyTable;
}>;

export function loadTableTask(params: { autoAnalyze: boolean }): ListrTask<LoadTableTaskContext, ListrDefaultRenderer> {
  return {
    title: "Loading dependency table",
    enabled: (ctx) => Boolean(ctx.config && ctx.project),
    task: async (ctx, task) => {
      let autoAnalyze = params.autoAnalyze;
      if (autoAnalyze) {
        task.title = "Creating dependency table";
      } else {
        const cache = loadTable(ctx.config!, ctx.project!.$name);
        if (cache) {
          task.output = `Cache found: ${cache.createdAt}`;
          ctx.table = cache.table;
        } else {
          task.output = `No cache found`;
        }
        if (!cache) {
          autoAnalyze = await task.prompt<boolean>({
            type: "Toggle",
            message: "Would you like to analyze now?",
          });
        }
      }

      if (autoAnalyze) {
        return task.newListr([analyzeProjectTask(), saveTableTask()], {
          rendererOptions: {
            collapseSubtasks: false,
          },
        });
      }
    },
    options: {
      persistentOutput: true,
    },
  };
}
