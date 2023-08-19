# kt-graph

Analyze & visualize class/type dependency of Kotlin codebase.

| Entire codebase of [Exposed](https://github.com/JetBrains/Exposed) | Queried for 'math' |
|---|---|
| ![](./example/exposed_full.svg) | ![](./example/exposed_queried.svg) |

<sup>Check [Example in action](#example-in-action) and try it yourself.</sup>

## Use as a library

```sh
npm i @kt-graph/core
```

## CLI

```sh
pnpm i -g @kt-graph/cli
```
<sup>Wondering why not **npm**? - Check [Known issues](#known-issues) below for details.</sup>

Quick start with:

```sh-session
$ kt-graph -h
```

There are mainly two commands available:

```sh-session
$ kt-graph analyze -h
Usage: kt-graph analyze [options] <project>

Arguments:
  project     project name

Options:
  -h, --help  display help for command
```

```sh-session
$ kt-graph graph -h
Usage: kt-graph graph [options] <project>

Arguments:
  project                  project name

Options:
  -o, --output <file>      output file (default: "graph.pdf")
  -q, --query <regexp>     query string
  -e, --exclude <regexp>   exclude query string
  -i, --case-insensitive   use case insensitive mode for --query and --exclude (default: false)
  --forward-depth <level>  depth of forward dependency (default: "3")
  --inverse-depth <level>  depth of inverse dependency (default: "3")
  -c, --cluster            visualize cluster (default: false)
  -F, --no-filter          disable filter
  -h, --help               display help for command
```

### Configuration file

Create a `kt-graph.yml` at the root of your project. Here's a quick peek into its structure:

```typescript
type Config = {
  version: 1; // Constant
  projects: Record<ProjectName, Project>;
};

type ProjectName = string;

type Project = {
  files: FileGlob[],
  includePatterns?: IdentifierPattern[];
  unifyRules?: [RegExpString, RegExpReplacement][];
};

type FileGlob = string;

type IdentifierPattern = string;

type RegExpString = string;

type RegExpReplacement = string;
```

## Example in action

1\. Clone [JetBrains/Exposed](https://github.com/JetBrains/Exposed):

```sh-session
$ git clone https://github.com/JetBrains/Exposed.git
$ cd ./Exposed
```

2\. Set up the configuration and run kt-graph commands to analyze and visualize:

```sh-session
$ cat > kt-graph.yml
version: 1

projects:
  all:
    files:
      - ./exposed-core/src/main/kotlin/**/*.kt
      - ./exposed-crypt/src/main/kotlin/**/*.kt
      - ./exposed-dao/src/main/kotlin/**/*.kt
    includePatterns:
      - "org.jetbrains.exposed.**"
    unifyRules:
      - ["\\.Companion(\\.|$)", ""]
      - ["(exposed\\.sql\\.Op)\\.\\w+", "$1"]
^D
```

3\. Analyze kotlin files and build a dependency table.

```sh-session
$ kt-graph analyze all
Analyzed ./exposed-core/src/main/kotlin/org/jetbrains/exposed/sql/AbstractQuery.kt
Analyzed ./exposed-core/src/main/kotlin/org/jetbrains/exposed/sql/Alias.kt
Analyzed ./exposed-core/src/main/kotlin/org/jetbrains/exposed/sql/Column.kt (with error)
Analyzed ./exposed-core/src/main/kotlin/org/jetbrains/exposed/sql/ColumnDiff.kt
...(omitted)
```

4\. Create a graph with various options.

```sh-session
$ kt-graph graph all -c -q 'math' -i
Matching nodes: 18
Total nodes: 45
Total edges: 78

$ open graph.pdf
```

## Known issues

- `npm install --location=global` fails with a message `Error: Cannot find module 'nan'` due to [tree-sitter-kotlin](https://github.com/fwcd/tree-sitter-kotlin/blob/06a2f6e71c7fcac34addcbf2a4667adad1b9c5a7/package.json#L8).
    - I'm a bit stumped as it works straightforwardly with `npm install` (not global) or `pnpm install --global`.
    - Any insights to help resolve it would be appreciated.
- `tree-sitter-kotlin` generally works adequately, but it does have some bugs affecting precise parsing, which lead to missing nodes and links in your output graphs.
