import { Command } from "commander";
import { loadConfig } from "./config";
import { runAnalyze } from "./analyze";
import { runGraph } from "./graph";

const workingDir = process.cwd();

const program = new Command();

program.name("kt-graph").description("Analyze & visualize class/type dependency of Kotlin codebase").version("0.0.1");

program
  .command("analyze")
  .argument("<project>", "project name")
  .action((project) => {
    const config = loadConfig(workingDir);
    runAnalyze(config, {
      projectName: project,
    });
  });

program
  .command("graph")
  .argument("<project>", "project name")
  .option("-o, --output <file>", "output file", "graph.pdf")
  .option("-q, --query <regexp>", "query string")
  .option("-e, --exclude <regexp>", "exclude query string")
  .option("-i, --case-insensitive", "use case insensitive mode for --query and --exclude", false)
  .option("--forward-depth <level>", "depth of forward dependency", "3")
  .option("--inverse-depth <level>", "depth of inverse dependency", "3")
  .option("-c, --cluster", "visualize cluster", false)
  .option("-F, --no-filter", "disable filter", false)
  .action((projectName, options) => {
    const config = loadConfig(workingDir);
    const regexpFlags = options.caseInsensitive ? "i" : "";
    runGraph(config, {
      projectName,
      output: options.output,
      query: options.query ? new RegExp(options.query, regexpFlags) : undefined,
      exclude: options.exclude ? new RegExp(options.exclude, regexpFlags) : undefined,
      forwardDepth: parseInt(options.forwardDepth, 10),
      inverseDepth: parseInt(options.inverseDepth, 10),
      cluster: !!options.cluster,
      filter: !options.noFilter,
    });
  });

program.parse();
