import { writeFileSync } from "fs";
import path from "path";
import graphviz from "graphviz";
import { DependencyGraph, createIncludeFilter, createUnifyFilter } from "@kt-graph/core";
import { Config, fetchProject } from "./config";
import { loadTable } from "cache";

export function runGraph(
  config: Config,
  params: {
    projectName: string;
    output: string;
    query?: RegExp;
    exclude?: RegExp;
    forwardDepth: number;
    inverseDepth: number;
    cluster: boolean;
    filter: boolean;
  }
) {
  const project = fetchProject(config, params.projectName);

  const cache = loadTable(config, project.$name);
  if (!cache) {
    console.error(`No cache data found for '${project.$name}'.`);
    console.error(`Run \`analyze\` command first.`);
    process.exit(1);
  }

  cache.table.applyFilters({
    include: params.filter && project.includePatterns ? createIncludeFilter(project.includePatterns) : undefined,
    unify: project.unifyRules ? createUnifyFilter(project.unifyRules) : undefined,
  });

  const graph = new DependencyGraph(cache.table.data);
  const graphInfo = graph.calculate({
    query: params.query,
    exclude: params.exclude,
    forwardDepth: params.forwardDepth,
    inverseDepth: params.inverseDepth,
  });

  if (graphInfo.matchingNodesCount !== graphInfo.nodesCount) {
    console.log("Matching nodes:", graphInfo.matchingNodesCount);
  }
  console.log("Total nodes:", graphInfo.nodesCount);
  console.log("Total edges:", graphInfo.edgesCount);

  const g = makeGraphviz(graph, { cluster: params.cluster });

  const format = path.extname(params.output).slice(1);
  switch (format) {
    case "dot": {
      writeFileSync(params.output, g.to_dot());
      break;
    }
    default: {
      g.output(format, params.output);
    }
  }
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
