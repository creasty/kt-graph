import { createIncludeFilter, createUnifyFilter, DependencyTable } from "@kt-graph/core";
import { Config, Project } from "config";
import { ListrTask, ListrDefaultRenderer } from "listr2";

export type ApplyTableFiltersTaskContext = Partial<{
  // Input
  config: Config;
  project: Project;
  table: DependencyTable;
}>;

export function applyTableFilterTask(): ListrTask<ApplyTableFiltersTaskContext, ListrDefaultRenderer> {
  return {
    title: "Applying table filters",
    enabled: (ctx) => Boolean(ctx.config && ctx.project && ctx.table),
    task: async (ctx, task) => {
      ctx.table!.applyFilters({
        include: createIncludeFilter(ctx.project!.includePatterns),
        unify: ctx.project!.unifyRules ? createUnifyFilter(ctx.project!.unifyRules) : undefined,
      });
      task.output = "Filters applied";
    },
  };
}
