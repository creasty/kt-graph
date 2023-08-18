import { Command } from "commander";
import { runAnalyze } from "./analyze";
import { runGraph } from "./graph";

const program = new Command();

program
  .name("kotlin-class-graph")
  .description("Generate a graph of Kotlin classes and their dependencies")
  .version("0.0.1");

program
  .command("analyze")
  .argument("<dir>", "file glob pattern")
  .action((dir) => {
    runAnalyze({
      dir,
    });
  });
program
  .command("graph")
  .argument("<dir>", "file glob pattern")
  .option("-o, --output <file>", "output file", "graph.pdf")
  .option("-q, --query <regexp>", "query string")
  .option("-e, --exclude <regexp>", "exclude query string")
  .option("--forward-depth <level>", "depth of forward dependency", "3")
  .option("--inverse-depth <level>", "depth of inverse dependency", "3")
  .option("-c, --cluster", "visualize cluster", false)
  .option("-F, --no-filter", "disable filter", false)
  .action((dir, options) => {
    runGraph({
      dir,
      output: options.output,
      query: options.query ? new RegExp(options.query) : undefined,
      exclude: options.exclude ? new RegExp(options.exclude) : undefined,
      forwardDepth: parseInt(options.forwardDepth, 10),
      inverseDepth: parseInt(options.inverseDepth, 10),
      cluster: !!options.cluster,
      filter: !options.noFilter,
    });
  });

program.parse();
