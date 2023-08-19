import { globSync } from "fast-glob";
import { readFileSync } from "fs";
import { DependencyTable, FileAnalyzer } from "@kt-graph/core";
import { Config, fetchProject } from "./config";
import { saveTable } from "cache";

export function runAnalyze(config: Config, params: { projectName: string }) {
  const project = fetchProject(config, params.projectName);

  const table = new DependencyTable();

  const files = globSync(project.files);
  files.forEach((file) => {
    const sourceCode = readFileSync(file, "utf8");
    const analyzer = new FileAnalyzer(table);
    const hasError = analyzer.analyze(sourceCode);
    console.log(`Analyzed ${file}`, hasError ? "(with error)" : "");
  });

  const info = table.finalize();
  if (info.unresolvableRefs.size) {
    console.log("Could not resolve some refs:", info.unresolvableRefs);
  }

  saveTable(config, params.projectName, table);
}
