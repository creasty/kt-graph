import { DependencyGraph } from "@kt-graph/core";
import { ListrTask, ListrDefaultRenderer } from "listr2";
import graphviz from "graphviz";
import path from "path";
import { writeFileSync } from "fs";

export type ExportGraphTaskContext = Partial<{
  // Input
  graph: DependencyGraph;
}>;

export function exportGraphTask(params: {
  workingDir: string;
  output: string;
  cluster: boolean;
}): ListrTask<ExportGraphTaskContext, ListrDefaultRenderer> {
  return {
    title: "Exporting graph",
    enabled: (ctx) => Boolean(ctx.graph),
    task: async (ctx, task) => {
      const g = makeGraphviz(ctx.graph!, { cluster: params.cluster });

      const outputPath = path.resolve(params.workingDir, params.output);
      const format = path.extname(outputPath).slice(1);
      switch (format) {
        case "dot": {
          writeFileSync(outputPath, g.to_dot());
          break;
        }
        default: {
          g.output(format, outputPath);
        }
      }

      task.output = `Graph exported to '${outputPath}'`;
    },
    options: {
      persistentOutput: true,
    },
  };
}

function makeGraphviz(
  graph: DependencyGraph,
  params: {
    cluster: boolean;
  }
) {
  const g = graphviz.digraph("G");

  g.set("rankdir", "LR");
  if (params.cluster) {
    g.set("layout", "neato");
    g.set("overlap", "prism");
    g.set("model", "subset");
  }
  g.setEdgeAttribut("color", "0,0,0,.5");
  g.setNodeAttribut("shape", "box");
  g.setNodeAttribut("style", "rounded,filled");
  g.setNodeAttribut("color", "transparent");
  g.setNodeAttribut("fillcolor", "0,0,0,.06");
  g.setNodeAttribut("fontname", "Helvetica-Narrow");

  for (const node of graph.nodes()) {
    g.addNode(node.id, {
      fontname: node.matching ? "Helvetica-Narrow-Bold" : undefined,
      fillcolor: node.matching ? "0,0,0,.12" : undefined,
      label: formatIdentLabel(node.id),
    });
  }
  for (const edge of graph.edges()) {
    g.addEdge(edge.from, edge.to, { style: edge.inverse ? "dashed" : "solid" });
  }

  return g;
}

function formatIdentLabel(ident: string) {
  return ident.replace(
    /^((?:[a-z][a-zA-Z0-9]*\.)+)((?:[A-Z][a-zA-Z0-9]*)(?:\.[A-Z][a-zA-Z0-9]*)*)$/,
    `!<font point-size="12">$1</font><br/>$2`
  );
}
