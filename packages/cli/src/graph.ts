import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import graphviz from "graphviz";
import { DependencyTableRepo } from "./DependencyTableRepo";
import { DependencyGraph, createIncludeFilter, createUnifyFilter } from "@kt-graph/core";

const CONFIG_FILE_NAME = "kt-graph.json";

export function runGraph(params: {
  dir: string;
  output: string;
  query?: RegExp;
  exclude?: RegExp;
  forwardDepth: number;
  inverseDepth: number;
  cluster: boolean;
  filter: boolean;
}) {
  const repo = new DependencyTableRepo();
  const table = repo.find(params.dir);
  if (!table) {
    console.error(`No cache data found for ${path.resolve(params.dir)}.`);
    console.error(`Run \`analyze\` command first.`);
    process.exit(1);
  }

  const config = findConfigFile(params.dir);

  table.applyFilters({
    include: params.filter ? createIncludeFilter(config) : undefined,
    unify: createUnifyFilter(config),
  });

  const graph = new DependencyGraph(table.data);
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

  switch (path.extname(params.output)) {
    case ".dot": {
      writeFileSync(params.output, g.to_dot());
      break;
    }
    case ".pdf": {
      g.output("pdf", params.output);
      break;
    }
    default: {
      console.error("Invalid output file extension");
      process.exit(1);
    }
  }
}

function findConfigFile(dir: string) {
  let baseDir = path.resolve(dir);
  while (baseDir && baseDir !== "/") {
    const configFilePath = path.resolve(baseDir, CONFIG_FILE_NAME);
    if (existsSync(configFilePath)) {
      const json = readFileSync(configFilePath, "utf8");
      return JSON.parse(json);
    }
    baseDir = path.dirname(baseDir);
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
