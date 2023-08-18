import { globSync } from "fast-glob";
import { readFileSync } from "fs";
import { DependencyTableRepo } from "./DependencyTableRepo";
import { DependencyTable, FileAnalyzer } from "@kt-graph/core";

export function runAnalyze(params: { dir: string }) {
  const table = new DependencyTable();

  const files = globSync(`${params.dir}/**/*.kt`);
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

  const repo = new DependencyTableRepo();
  repo.save(params.dir, table);
}
