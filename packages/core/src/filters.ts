import type { DependencyTableFilters } from "./DependencyTable";

export function createIncludeFilter(includePatterns: string[]): DependencyTableFilters["include"] {
  if (!includePatterns.length) return;

  const rules = includePatterns.map((pattern) => {
    const negated = pattern.startsWith("!");
    return {
      regexp: convertIdentPatternToRegexp(negated ? pattern.slice(1) : pattern),
      expected: !negated,
    };
  });

  return (ident: string) => {
    return rules.every((rule) => rule.regexp.test(ident) === rule.expected);
  };
}

export function createUnifyFilter(unifyRules: [string, string][]): DependencyTableFilters["unify"] {
  if (!unifyRules.length) return;

  const substitutions = unifyRules.map(([pattern, replacement]) => {
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
        const prevChar = str[i - 1];
        let starCount = 1;
        while (str[i + 1] === "*") {
          starCount++;
          i++;
        }
        const nextChar = str[i + 1];

        const isDouble = starCount > 1;
        const isBounded = (prevChar === "." || !prevChar) && (nextChar === "." || !nextChar);

        if (isBounded) {
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
