import Parser, { Query } from "tree-sitter";
import Kotlin from "tree-sitter-kotlin";

export const parser = new Parser();
parser.setLanguage(Kotlin);

export const packageHeaderQuery = new Query(Kotlin, `(package_header (identifier) @ident)`);
export const importHeaderQuery = new Query(
  Kotlin,
  `(import_header
    (identifier) @ident
    (import_alias (type_identifier) @alias)?
  )`
);
export const declarationQuery = new Query(
  Kotlin,
  `[
    (class_declaration
      (modifiers (visibility_modifier) @vis)?
      (type_identifier) @ident
    ) @scope
    (object_declaration
      (modifiers (visibility_modifier) @vis)?
      (type_identifier) @ident
    ) @scope
    (companion_object
      (modifiers (visibility_modifier) @vis)?
      (type_identifier)? @ident
    ) @scope
  ]`
);
export const typeAliasQuery = new Query(
  Kotlin,
  `(type_alias
    (modifiers (visibility_modifier) @vis)?
    (type_identifier) @alias
    (user_type) @type
  ) @scope`
);
export const referenceQuery = new Query(Kotlin, `(user_type) @type @scope`);

export type VisibilityModifier = "public" | "private" | "internal" | "protected";

export const builtinClasses = new Set([
  "AbstractCollection",
  "AbstractIterator",
  "AbstractList",
  "AbstractMap",
  "AbstractMutableCollection",
  "AbstractMutableList",
  "AbstractMutableMap",
  "AbstractMutableSet",
  "AbstractSet",
  "AccessDeniedException",
  "Annotation",
  "AnnotationRetention",
  "AnnotationTarget",
  "Any",
  "Appendable",
  "ArithmeticException",
  "Array",
  "ArrayDeque",
  "ArrayIndexOutOfBoundsException",
  "ArrayList",
  "AssertionError",
  "AutoCloseable",
  "Boolean",
  "BooleanArray",
  "BooleanIterator",
  "BuilderInference",
  "Byte",
  "ByteArray",
  "ByteIterator",
  "Char",
  "CharArray",
  "CharCategory",
  "CharDirectionality",
  "CharIterator",
  "CharProgression",
  "CharRange",
  "CharSequence",
  "CharacterCodingException",
  "Charsets",
  "ClassCastException",
  "ClosedFloatingPointRange",
  "ClosedRange",
  "Collection",
  "Comparable",
  "Comparator",
  "ConcurrentModificationException",
  "ContextFunctionTypeParams",
  "DeepRecursiveFunction",
  "DeepRecursiveScope",
  "Deprecated",
  "DeprecatedSinceKotlin",
  "DeprecationLevel",
  "Double",
  "DoubleArray",
  "DoubleIterator",
  "DslMarker",
  "Enum",
  "Error",
  "Exception",
  "ExperimentalMultiplatform",
  "ExperimentalStdlibApi",
  "ExperimentalSubclassOptIn",
  "ExperimentalUnsignedTypes",
  "ExtensionFunctionType",
  "FileAlreadyExistsException",
  "FileSystemException",
  "FileTreeWalk",
  "FileWalkDirection",
  "Float",
  "FloatArray",
  "FloatIterator",
  "Function",
  "Grouping",
  "HashMap",
  "HashSet",
  "IllegalArgumentException",
  "IllegalStateException",
  "IndexOutOfBoundsException",
  "IndexedValue",
  "Int",
  "IntArray",
  "IntIterator",
  "IntProgression",
  "IntRange",
  "Iterable",
  "Iterator",
  "JvmDefault",
  "JvmDefaultWithCompatibility",
  "JvmDefaultWithoutCompatibility",
  "JvmField",
  "JvmInline",
  "JvmMultifileClass",
  "JvmName",
  "JvmOverloads",
  "JvmRecord",
  "JvmRepeatable",
  "JvmSerializableLambda",
  "JvmStatic",
  "JvmSuppressWildcards",
  "JvmSynthetic",
  "JvmWildcard",
  "KotlinNullPointerException",
  "KotlinReflectionNotSupportedError",
  "KotlinVersion",
  "Lazy",
  "LazyThreadSafetyMode",
  "LinkedHashMap",
  "LinkedHashSet",
  "List",
  "ListIterator",
  "Long",
  "LongArray",
  "LongIterator",
  "LongProgression",
  "LongRange",
  "Map",
  "MatchGroup",
  "MatchGroupCollection",
  "MatchNamedGroupCollection",
  "MatchResult",
  "Metadata",
  "MustBeDocumented",
  "MutableCollection",
  "MutableIterable",
  "MutableIterator",
  "MutableList",
  "MutableListIterator",
  "MutableMap",
  "MutableSet",
  "NoSuchElementException",
  "NoSuchFileException",
  "NoWhenBranchMatchedException",
  "NotImplementedError",
  "Nothing",
  "NullPointerException",
  "Number",
  "NumberFormatException",
  "Object",
  "OnErrorAction",
  "OpenEndRange",
  "OptIn",
  "OptionalExpectation",
  "OutOfMemoryError",
  "OverloadResolutionByLambdaReturnType",
  "Pair",
  "ParameterName",
  "PublishedApi",
  "PurelyImplements",
  "RandomAccess",
  "Regex",
  "RegexOption",
  "Repeatable",
  "ReplaceWith",
  "RequiresOptIn",
  "Result",
  "Retention",
  "RuntimeException",
  "Sequence",
  "SequenceScope",
  "Set",
  "Short",
  "ShortArray",
  "ShortIterator",
  "SinceKotlin",
  "Strictfp",
  "String",
  "StringBuilder",
  "SubclassOptInRequired",
  "Suppress",
  "SuppressWarnings",
  "Synchronized",
  "Target",
  "ThreadLocal",
  "Throwable",
  "Throws",
  "Transient",
  "Triple",
  "TypeCastException",
  "Typography",
  "UByte",
  "UByteArray",
  "UInt",
  "UIntArray",
  "UIntProgression",
  "UIntRange",
  "ULong",
  "ULongArray",
  "ULongProgression",
  "ULongRange",
  "UShort",
  "UShortArray",
  "UninitializedPropertyAccessException",
  "Unit",
  "UnsupportedOperationException",
  "Volatile",
]);
