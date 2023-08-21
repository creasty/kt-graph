import { Command } from "commander";
import { Listr } from "listr2";
import { loadConfigTask } from "tasks/loadConfigTask";
import { analyzeProjectTask } from "tasks/analyzeProjectTask";
import { saveTableTask } from "tasks/saveTableTask";
import { loadTableTask } from "tasks/loadTableTask";
import { applyTableFilterTask } from "tasks/applyTableFiltersTask";
import { calculateGraphTask } from "tasks/calculateGraphTask";
import { exportGraphTask } from "tasks/exportGraphTask";
import Enquirer from "enquirer";
import { parseRegExp } from "@kt-graph/core";

const program = new Command();

program.name("kt-graph").description("Analyze & visualize class/type dependencies in Kotlin codebase");

const VERSION = process.env.KT_GRAPH_VERSION;
if (VERSION) {
  program.version(VERSION);
}

program
  .command("analyze")
  .alias("a")
  .description("Analyze files and cache the dependency table")
  .argument("<project>", "Project name specified in the config file")
  .action(async (projectName: string) => {
    const workingDir = process.cwd();

    const tasks = new Listr<any>(
      [
        loadConfigTask({
          workingDir,
          projectName,
        }),
        analyzeProjectTask(),
        saveTableTask(),
      ],
      {
        injectWrapper: {
          enquirer: new Enquirer(), // @see https://github.com/listr2/listr2/issues/631
        },
      }
    );

    try {
      await tasks.run();
    } catch (e) {
      process.exit(1);
    }
  });

program
  .command("generate")
  .alias("g")
  .description("Generate a graph from the dependency table")
  .argument("<project>", "Project name specified in the config file")
  .option(
    "-o, --output <file>",
    `Output file path.\n` +
      `Change the extension to select a different output format.\n` +
      `Refer to https://graphviz.org/docs/outputs/ for the list of supported formats.`,
    "graph.pdf"
  )
  .option(
    "-q, --query <regexp>",
    `Search query for type names to include in the graph.\n` +
      `Default behavior is case sensitive. Wrap with '/•/i' to change that.\n` +
      `Example: 'foo|bar' (case sensitive), '/foo|bar/i' (case insensitive)`
  )
  .option(
    "-e, --exclude <regexp>",
    "Search query for type names to exclude from the graph.`+`\nRefer to --query for the syntax."
  )
  .option(
    "--forward-depth <level>",
    `Depth of graph for forward dependencies.\n` + `Effective when --query/--exclude creates a proper subgraph`,
    "3"
  )
  .option(
    "--inverse-depth <level>",
    `Depth of graph for inverse dependencies.\n` + `Refer to --forward-depth for more detail`,
    "3"
  )
  .option("-c, --cluster", "Enable cluster layout", false)
  .option("--update", "Update the dependency table (Shortcut to run analyze command together)", false)
  .action(async (projectName: string, options) => {
    const workingDir = process.cwd();

    const tasks = new Listr<any>(
      [
        loadConfigTask({
          workingDir,
          projectName,
        }),
        loadTableTask({
          update: options.update,
        }),
        applyTableFilterTask(),
        calculateGraphTask({
          query: options.query ? parseRegExp(options.query) : undefined,
          exclude: options.exclude ? parseRegExp(options.exclude) : undefined,
          forwardDepth: parseInt(options.forwardDepth, 10),
          inverseDepth: parseInt(options.inverseDepth, 10),
        }),
        exportGraphTask({
          workingDir,
          output: options.output,
          cluster: !!options.cluster,
        }),
      ],
      {
        injectWrapper: {
          enquirer: new Enquirer(), // @see https://github.com/listr2/listr2/issues/631
        },
      }
    );

    try {
      await tasks.run();
    } catch (e) {
      process.exit(1);
    }
  });

program.parse();
