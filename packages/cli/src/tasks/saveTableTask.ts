import { DependencyTable } from "@kt-graph/core";
import { saveTable } from "cache";
import { Config, Project } from "config";
import { ListrTask, ListrDefaultRenderer } from "listr2";

export type SaveTableTaskContext = Partial<{
  // Input
  config: Config;
  project: Project;
  table: DependencyTable;
}>;

export function saveTableTask(): ListrTask<SaveTableTaskContext, ListrDefaultRenderer> {
  return {
    title: "Saving dependency table",
    enabled: (ctx) => Boolean(ctx.config && ctx.project && ctx.table),
    task: async (ctx, task) => {
      saveTable(ctx.config!, ctx.project!.$name, ctx.table!);
      task.output = `Cache saved for '${ctx.project!.$name}'`;
    },
  };
}
