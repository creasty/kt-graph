import { DependencyTable, FileAnalyzer } from "@kt-graph/core";
import { Config, Project } from "config";
import { globSync } from "fast-glob";
import { readFileSync } from "fs";
import { ListrTask, ListrDefaultRenderer } from "listr2";

export type AnalyzeProjectTaskContext = Partial<{
  // Input
  config: Config;
  project: Project;

  // Output
  table: DependencyTable;
  filesWithError: Set<string>;
  unresolvableRefs: Set<string>;
}>;

export function analyzeProjectTask(): ListrTask<AnalyzeProjectTaskContext, ListrDefaultRenderer> {
  return {
    title: "Analyzing project",
    enabled: (ctx) => Boolean(ctx.config && ctx.project),
    task: async (ctx, task) => {
      task.title += `: ${ctx.project!.$name}`;

      const table = new DependencyTable();
      const filesWithError = new Set<string>();

      const files = globSync(ctx.project!.files);
      files.forEach((file) => {
        const sourceCode = readFileSync(file, "utf8");
        const analyzer = new FileAnalyzer(table);
        const hasError = analyzer.analyze(sourceCode);
        if (hasError) filesWithError.add(file);
        task.output = `Analyzed ${file}`;
      });

      const info = table.finalize();

      task.output = [
        `Analyzed ${pluralize(files.length, "file", "files")}.`,
        `Encountered ${pluralize(filesWithError.size, "error", "errors")}.`,
        `Found ${pluralize(info.unresolvableRefs.size, "unresolvable reference", "unresolvable references")}.`,
      ].join("\n");

      ctx.table = table;
      ctx.filesWithError = filesWithError;
      ctx.unresolvableRefs = info.unresolvableRefs;
    },
    options: {
      persistentOutput: true,
    },
  };
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}
