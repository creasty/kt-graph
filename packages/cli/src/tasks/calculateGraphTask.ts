import { DependencyGraph, DependencyTable } from "@kt-graph/core";
import { ListrTask, ListrDefaultRenderer } from "listr2";

export type CalculateGraphTaskContext = Partial<{
  // Input
  table: DependencyTable;

  // Output
  graph: DependencyGraph;
}>;

export function calculateGraphTask(params: {
  query?: RegExp;
  exclude?: RegExp;
  forwardDepth: number;
  inverseDepth: number;
}): ListrTask<CalculateGraphTaskContext, ListrDefaultRenderer> {
  return {
    title: "Calculating graph",
    enabled: (ctx) => Boolean(ctx.table),
    task: async (ctx, task) => {
      const graph = new DependencyGraph(ctx.table!.data);
      const graphInfo = graph.calculate({
        query: params.query,
        exclude: params.exclude,
        forwardDepth: params.forwardDepth,
        inverseDepth: params.inverseDepth,
      });
      ctx.graph = graph;

      task.output = [
        graphInfo.matchingNodesCount !== graphInfo.nodesCount
          ? `Matching nodes: ${graphInfo.matchingNodesCount}`
          : null,
        `Total nodes: ${graphInfo.nodesCount}`,
        `Total edges: ${graphInfo.edgesCount}`,
      ]
        .filter(Boolean)
        .join("\n");
    },
    options: {
      persistentOutput: true,
    },
  };
}
