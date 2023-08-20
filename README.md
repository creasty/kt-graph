# kt-graph

Analyze & visualize class/type dependency of Kotlin codebase.

| Entire codebase of [Exposed](https://github.com/JetBrains/Exposed) | Queried for 'math' |
|---|---|
| ![](./example/exposed_full.svg) | ![](./example/exposed_queried.svg) |

<sup>Check out [Example in action](#example-in-action) and try it for yourself.</sup>

## Use as a library

```sh
npm i @kt-graph/core
```

## CLI

```sh
pnpm i -g @kt-graph/cli
```
<sup>Wondering why not **npm**? - Read [Known issues](#known-issues) for more details.</sup>

```sh-session
$ kt-graph -h
```

You have two primary commands to use:

```sh-session
$ kt-graph analyze -h
Usage: kt-graph analyze [options] <project>

Analyze and create a dependency table

Arguments:
  project     project name

Options:
  -h, --help  display help for command
```

```sh-session
$ kt-graph graph -h
Usage: kt-graph graph [options] <project>

Visualize a dependency graph

Arguments:
  project                  project name

Options:
  -o, --output <file>      output file path (default: "graph.pdf")
  -q, --query <regexp>     query string
  -e, --exclude <regexp>   exclude query string
  -c, --cluster            visualize cluster (default: false)
  --forward-depth <level>  depth of forward dependencies (default: "3")
  --inverse-depth <level>  depth of inverse dependencies (default: "3")
  --analyze                analyze without cache (default: false)
  -h, --help               display help for command
```

### Configuration file

Create a `kt-graph.yml` at the root of your project.

JSON/YAML Schema is available [here](https://raw.githubusercontent.com/creasty/kt-graph/master/config-schema.json).

```yml
# yaml-language-server: $schema=https://raw.githubusercontent.com/creasty/kt-graph/master/config-schema.json
version: 1

projects:
  all:
    # start here
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
    typeNames:
      - "org.jetbrains.exposed.**"
    unifyRules:
      - ["\\.Companion(\\.|$)", ""]
      - ["(exposed\\.sql\\.Op)\\.\\w+", "$1"]
^D
```

3\. Analyze kotlin files and build a dependency table.

```sh-session
$ kt-graph analyze all
✔ Load config
✔ Analyzing project: all
  › Analyzed 85 files.
    Encountered 9 errors.
    Found 132 unresolvable references.
✔ Saving dependency table
```

4\. Create a graph with various options.

```sh-session
$ kt-graph graph all -o full.svg -c
✔ Load config
✔ Loading dependency table
  › Cache found: 2023-08-20T05:09:35.377Z
✔ Applying table filters
✔ Calculating graph
  › Total nodes: 335
    Total edges: 1001
✔ Exporting graph
  › Graph exported to '/Users/creasty/go/src/github.com/JetBrains/Exposed/full.svg'

$ kt-graph graph all -o math.svg -c -q '/math/i'
✔ Load config
✔ Loading dependency table
  › Cache found: 2023-08-20T05:09:35.377Z
✔ Applying table filters
✔ Calculating graph
  › Matching nodes: 18
    Total nodes: 45
    Total edges: 78
✔ Exporting graph
  › Graph exported to '/Users/creasty/go/src/github.com/JetBrains/Exposed/math.svg'
```

## Known issues

- `npm install --location=global` fails with a message `Error: Cannot find module 'nan'` due to [tree-sitter-kotlin](https://github.com/fwcd/tree-sitter-kotlin/blob/06a2f6e71c7fcac34addcbf2a4667adad1b9c5a7/package.json#L8).
    - I'm a bit stumped as it works straightforwardly with `npm install` (not global) or `pnpm install --global`.
    - Any insights to help resolve it would be appreciated.
- `tree-sitter-kotlin` generally works adequately, but it does have some bugs affecting precise parsing, which lead to missing nodes and links in your output graphs.
