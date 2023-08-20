import Parser from "tree-sitter";
import { IntervalTree, Interval } from "node-interval-tree";
import {
  builtinClasses,
  declarationQuery,
  importHeaderQuery,
  packageHeaderQuery,
  parser,
  referenceQuery,
  typeAliasQuery,
  VisibilityModifier,
} from "./language";
import { Identifiable, requireNotNull, Table, withCache } from "./util";
import { buildAmbiguousRef, DependencyTable } from "./DependencyTable";

class Declaration implements Identifiable, Interval {
  packageName: string;
  name: string;
  visibility: VisibilityModifier;

  low: number;
  high: number;

  constructor(params: {
    packageName: string;
    name: string;
    visibility?: VisibilityModifier;
    startIndex: number;
    endIndex: number;
  }) {
    this.packageName = params.packageName;
    this.name = params.name;
    this.visibility = params.visibility ?? "public";
    this.low = params.startIndex;
    this.high = params.endIndex;
  }

  get isPrivate() {
    return this.visibility === "private";
  }

  get nodeId() {
    return this.low;
  }

  toId(): string {
    return `decl:${this.name}@${this.nodeId}`;
  }

  get score() {
    return this.high - this.low;
  }
}

class Reference implements Identifiable, Interval {
  packageName: string;
  name: string;

  low: number;
  high: number;

  constructor(params: { packageName: string; name: string; startIndex: number; endIndex: number }) {
    this.packageName = params.packageName;
    this.name = params.name;
    this.low = params.startIndex;
    this.high = params.endIndex;
  }

  get nodeId() {
    return this.low;
  }

  toId(): string {
    return `ref:${this.name}@${this.nodeId}`;
  }
}

export class FileAnalyzer {
  #packageName = "";
  #imports = new Map<string, string>();
  #declarations = new Array<Declaration>();
  #references = new Array<Reference>();
  #aliases = new Map<Declaration, Reference>();
  #table: DependencyTable;

  constructor(table: DependencyTable) {
    this.#table = table;
  }

  analyze(sourceCode: string) {
    const tree = parser.parse(sourceCode);
    // console.log(tree.rootNode.toString());

    this.#parsePackageHeader(tree.rootNode);
    this.#parseImportHeaders(tree.rootNode);
    this.#parseDeclarations(tree.rootNode);
    this.#parseTypeAliases(tree.rootNode);
    this.#parseReferences(tree.rootNode);
    this.#resolveRefs();

    return tree.rootNode.hasError();
  }

  #parsePackageHeader(node: Parser.SyntaxNode) {
    this.#packageName = requireNotNull(packageHeaderQuery.captures(node).at(0)).node.text;
  }

  #parseImportHeaders(node: Parser.SyntaxNode) {
    importHeaderQuery.matches(node).forEach((match) => {
      const c = toNamedCapture(match.captures);
      const identNode = requireNotNull(c.get("ident")?.at(0)).node;
      const aliasNode = c.get("alias")?.at(0)?.node;

      const ident = identNode.text;
      const localIdent = aliasNode?.text ?? requireNotNull(ident.split(".").at(-1));
      this.#imports.set(localIdent, ident);
    });
  }

  #parseDeclarations(node: Parser.SyntaxNode) {
    declarationQuery.matches(node).forEach((match) => {
      const c = toNamedCapture(match.captures);
      const scopeNode = requireNotNull(c.get("scope")?.at(0)).node;
      const identNode = c.get("ident")?.at(0)?.node;
      const visNode = c.get("vis")?.at(0)?.node;

      const name =
        scopeNode.type === "companion_object" ? identNode?.text ?? "Companion" : requireNotNull(identNode?.text);

      this.#addDeclaration({ name, visNode, scopeNode });
    });
  }

  #parseTypeAliases(node: Parser.SyntaxNode) {
    typeAliasQuery.matches(node).forEach((match) => {
      const c = toNamedCapture(match.captures);
      const scopeNode = requireNotNull(c.get("scope")?.at(0)).node;
      const typeNode = requireNotNull(c.get("type")?.at(0)).node;
      const aliasNode = requireNotNull(c.get("alias")?.at(0)).node;
      const visNode = c.get("vis")?.at(0)?.node;

      const decl = this.#addDeclaration({
        name: aliasNode.text,
        visNode,
        scopeNode,
      });

      this.#parseUserType(typeNode).forEach((name) => {
        const ref = this.#addReference({ name, scopeNode });
        this.#aliases.set(decl, ref);
      });
    });
  }

  #parseReferences(node: Parser.SyntaxNode) {
    referenceQuery.matches(node).forEach((match) => {
      const c = toNamedCapture(match.captures);
      const typeNode = requireNotNull(c.get("type")?.at(0)).node;
      const scopeNode = requireNotNull(c.get("scope")?.at(0)).node;
      this.#parseUserType(typeNode).forEach((name) => {
        this.#addReference({ name, scopeNode });
      });
    });
  }

  #parseUserType(node: Parser.SyntaxNode): string[] {
    const result: string[][] = [];

    // Break down generics
    const walk = (cursor: Parser.TreeCursor) => {
      for (;;) {
        switch (cursor.nodeType) {
          case "user_type": {
            result.push([]);
            break;
          }
          case "type_identifier": {
            result.at(-1)?.push(cursor.nodeText);
            break;
          }
        }

        // Go to next node
        if (cursor.gotoFirstChild()) {
          walk(cursor);
          cursor.gotoParent();
        }
        if (!cursor.gotoNextSibling()) break;
      }
    };
    walk(node.walk());

    return result.map((v) => v.join("."));
  }

  #addReference(params: { name: string; visNode?: Parser.SyntaxNode; scopeNode: Parser.SyntaxNode }) {
    const ref = new Reference({
      packageName: this.#packageName,
      name: params.name,
      startIndex: params.scopeNode.startIndex,
      endIndex: params.scopeNode.endIndex,
    });
    this.#references.push(ref);
    return ref;
  }

  #addDeclaration(params: { name: string; visNode?: Parser.SyntaxNode; scopeNode: Parser.SyntaxNode }) {
    const decl = new Declaration({
      packageName: this.#packageName,
      name: params.name,
      visibility: params.visNode?.text as any,
      startIndex: params.scopeNode.startIndex,
      endIndex: params.scopeNode.endIndex,
    });
    this.#declarations.push(decl);
    return decl;
  }

  #resolveRefs() {
    const declTree = new IntervalTree<Declaration>();
    for (const decl of this.#declarations) {
      declTree.insert(decl);
    }

    const resolveDeclIdent = withCache((decl: Declaration) => {
      const decls = declTree
        .search(decl.low, decl.high)
        .filter((a) => a.low <= decl.low && a.high >= decl.high)
        .sort((a, b) => b.score - a.score);

      return [this.#packageName, ...decls.map((decl) => decl.name)].join(".");
    });

    const resolveRefDependents = withCache((ref: Reference) => {
      const all = declTree.search(ref.low, ref.high).sort((a, b) => a.score - b.score);
      return {
        all,
        direct: all.at(0),
        parent: all.at(1),
      };
    });

    const resolveRefIdent = withCache((ref: Reference) => {
      // Fully qualified name
      if (/^[a-z]/.test(ref.name)) {
        return ref.name;
      }

      const components = ref.name.split(".");
      for (let pos = components.length; pos >= 1; pos--) {
        const matchingName = components.slice(0, pos).join(".");
        const remaining = components.slice(pos);

        // Scope local types
        if (pos === 1) {
          const dependent = resolveRefDependents(ref);
          for (const decl of dependent.all) {
            if (decl.name === matchingName) {
              return [resolveDeclIdent(decl), ...remaining].join(".");
            }
          }

          const parent = dependent.parent ?? dependent.direct;
          const siblings = parent ? declTree.search(parent.low, parent.high).sort((a, b) => a.score - b.score) : [];
          for (const decl of siblings) {
            if (decl.name === matchingName) {
              return [resolveDeclIdent(decl), ...remaining].join(".");
            }
          }
        }

        // Imported types
        const imported = this.#imports.get(matchingName);
        if (imported) {
          return [imported, ...remaining].join(".");
        }

        // Builtin types
        if (builtinClasses.has(matchingName)) {
          return ref.name;
        }
      }

      // Ambiguous - Package local, type variables, etc.
      return buildAmbiguousRef(this.#packageName, ref.name);
    });

    // Register declarations
    for (const decl of this.#declarations) {
      if (decl.isPrivate) continue;
      const declIdent = resolveDeclIdent(decl);
      this.#table.addDeclaration(declIdent);
    }

    // Build a canonical ref map to eliminate private aliases
    const canonicalRefIdentMap = new Map<string, string>();
    for (const [decl, ref] of this.#aliases) {
      if (!decl.isPrivate) continue;
      const declIdent = resolveDeclIdent(decl);
      const refIdent = resolveRefIdent(ref);
      canonicalRefIdentMap.set(declIdent, refIdent);
    }

    // Create dependency paths
    for (const ref of this.#references) {
      const decl = resolveRefDependents(ref).direct;
      if (!decl || decl.isPrivate) continue;

      const declIdent = resolveDeclIdent(decl);
      const refIdent = resolveRefIdent(ref);
      const canonicalRefIdent = canonicalRefIdentMap.get(refIdent) ?? refIdent;
      this.#table.addReference(declIdent, canonicalRefIdent);
    }
  }
}

function toNamedCapture(captures: Parser.QueryCapture[]): Map<string, Parser.QueryCapture[]> {
  const table = new Table<string, Parser.QueryCapture[]>(null, () => []);
  captures.forEach((c) => table.fetch(c.name).push(c));
  return table;
}
