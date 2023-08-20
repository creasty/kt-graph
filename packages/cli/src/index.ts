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

program.name("kt-graph").description("Analyze & visualize class/type dependency of Kotlin codebase").version("0.0.5");

program
  .command("analyze")
  .description("Analyze and create a dependency table")
  .argument("<project>", "project name")
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
  .command("graph")
  .description("Create a dependency graph")
  .argument("<project>", "project name")
  .option("-o, --output <file>", "output file path", "graph.pdf")
  .option("-q, --query <regexp>", "query string")
  .option("-e, --exclude <regexp>", "exclude query string")
  .option("-c, --cluster", "enable cluster layout", false)
  .option("--forward-depth <level>", "depth of forward dependencies", "3")
  .option("--inverse-depth <level>", "depth of inverse dependencies", "3")
  .option("--update", "run analyze command and update a dependency table", false)
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
