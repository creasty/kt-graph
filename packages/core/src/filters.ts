import type { DependencyTableFilters } from "./DependencyTable";

export function createIncludeFilter(params: {
  includePatterns?: string[];
  excludePatterns?: string[];
}): DependencyTableFilters["include"] {
  const createFilter = (patterns: string[] | undefined) => {
    if (!patterns?.length) return;

    const regexpPatterns = patterns.map(convertIdentPatternToRegexp);

    return (ident: string) => {
      return regexpPatterns.some((filter) => filter.test(ident));
    };
  };

  const include = createFilter(params.includePatterns);
  const exclude = createFilter(params.excludePatterns);
  if (!include && !exclude) return;

  return (ident: string): boolean => {
    if (include && !include(ident)) return false;
    if (exclude && exclude(ident)) return false;
    return true;
  };
}

export function createUnifyFilter(params: { unifyRules?: [string, string][] }): DependencyTableFilters["unify"] {
  if (!params.unifyRules?.length) return;

  const substitutions = params.unifyRules.map(([pattern, replacement]) => {
    return { regexp: new RegExp(pattern), replacement };
  });

  return (ident: string) => {
    let result = ident;
    for (const { regexp, replacement } of substitutions) {
      result = result.replace(regexp, replacement);
    }
    return result;
  };
}

export function convertIdentPatternToRegexp(str: string): RegExp {
  let source = "";
  let groupOpenCount = 0;

  for (let i = 0, len = str.length; i < len; i++) {
    const c = str[i];
    switch (c) {
      case "*": {
        // Move over all consecutive "*"'s.
        // Also store the previous and next characters
        const prevChar = str[i - 1];
        let starCount = 1;
        while (str[i + 1] === "*") {
          starCount++;
          i++;
        }
        const nextChar = str[i + 1];

        const isDouble = starCount > 1;
        const isBoundedBoth = (prevChar === "." || !prevChar) && (nextChar === "." || !nextChar);

        if (isBoundedBoth) {
          if (isDouble) {
            source += "((\\.|\\b)(\\w+(\\.|\\b))*)?";
          } else {
            source += "((\\.|\\b)(\\w+(\\.|\\b))?)?";
          }
        } else {
          if (prevChar === ".") source += "\\.";
          source += "(\\w*)";
          if (nextChar === ".") source += "\\.";
        }

        break;
      }
      case "?": {
        source += "\\w";
        break;
      }
      case ".": {
        const prevChar = str[i - 1];
        const nextChar = str[i + 1];
        if (prevChar !== "*" && nextChar !== "*") {
          source += "\\.";
        }
        break;
      }
      case "{": {
        groupOpenCount++;
        source += "(";
        break;
      }
      case "}": {
        if (groupOpenCount === 0) {
          source += "\\}";
        } else {
          groupOpenCount--;
          source += ")";
        }
        break;
      }
      case ",": {
        if (groupOpenCount === 0) {
          source += ",";
        } else {
          source += "|";
        }
        break;
      }
      default: {
        source += c;
      }
    }
  }

  return new RegExp(`^${source}$`);
}
