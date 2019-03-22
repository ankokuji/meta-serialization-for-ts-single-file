import ts from "typescript";
import lodash from "lodash";
import { DecoratorDescriptorAug } from "../types/decorator";
import { GlobalStorage, DecoratorDescriptor } from "../types/decorator";

enum AstParamsType {
  null,
  literal,
  identifier,
  object,
  error,
  propertyAccess
}

const revertSyntaxKindMap = lodash.invert(ts.SyntaxKind)

export function getMetaData(node: ts.SourceFile | string) {
  if (typeof node === "string") {
    node = ts.createSourceFile(
      "haha",
      node,
      ts.ScriptTarget.ES2015,
      false,
      ts.ScriptKind.TS
    );
  }

  // console.log(chalk.green("retrieving metadata from decorators ...\n"));

  const globalStore: GlobalStorage = [];
  const curriedHandlClassNode = lodash.curry(handleClassNode)(globalStore);
  const curriedGetMemberDecorations = lodash.curry(injectMemberDecorations)(
    globalStore
  );

  traverse(node);
  return globalStore;

  function traverse(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.ClassDeclaration:
        const classDeclaration = node as ts.ClassDeclaration;
        curriedHandlClassNode(classDeclaration);
        curriedGetMemberDecorations(classDeclaration);
        break;
    }

    ts.forEachChild(node, traverse);
  }
}

/**
 * Generate decoration info of class members and push them into global storage.
 *
 * @param {GlobalStorage} globalStorage
 * @param {ts.ClassDeclaration} node
 */
function injectMemberDecorations(
  globalStorage: GlobalStorage,
  node: ts.ClassDeclaration
) {
  const className = node.name && node.name.text;
  const storageItem = lodash.find(globalStorage, { className });

  if (!storageItem) {
    throw new Error(
      "cant find class detail object in global storage, maybe logic has sth wrong"
    );
  }

  // This will extract all decorated class property and generate
  // structured info.
  node.members.forEach(member => {
    const meta = genDecoratorMetaFromClassMember(member);
    if(meta) {
      storageItem.members.push(meta);
    }
  });
}

/**
 * Generate decorator meta from specific class member.
 * Include functions and propertys.
 *
 * @param {ts.ClassElement} member
 * @returns
 */
function genDecoratorMetaFromClassMember(member: ts.ClassElement) {
  const decorators =
    member.decorators &&
    member.decorators.map(decorator => {
      const decoratorDescriptor = handleDecoratorNode(decorator);
      return postDecoratorDescriptContentHandler(
        decoratorDescriptor,
        hanldePropertyAccessContent
      );
    });

  if (decorators) {
    const name = (member.name as ts.Identifier).text;
    const type = getTypeFromClassMember(member);
    return {
      name,
      type,
      decorators
    };
  }
}

/**
 * Get the type definition of a class member.
 *
 * @param {ts.ClassElement} node
 * @returns
 */
function getTypeFromClassMember(node: ts.ClassElement) {
  let type = "";

  if (ts.isMethodDeclaration(node)) {
    // Method declaration can not be serialized, so ignored.
    type = "function";
  }
  // TODO: handle all kinds of node type, currently only get identifier for datasource
  else if (ts.isPropertyDeclaration(node)) {

    if (
      node.type &&
      ts.isTypeReferenceNode(node.type) &&
      ts.isIdentifier(node.type.typeName)
    ) {
      // Node is a typereference so it was defined somewhere else.
      // And only return identifier name of this type.
      type = node.type.typeName.text;
    } 
    else if (node.type && ts.isTypeNode(node.type)) {
      // Node is a primitive type.
      type = getPrimitiveTsType_(node.type.kind);
    }
  }

  return type;
}

enum TypeString {
  string = "string",
  number = "number",
  boolean = "boolean",
  undefined = "undefined",
  void = "void"
}

/**
 * Mapping syntax kind number to type string .
 *
 * @param {ts.SyntaxKind} kind
 * @returns
 */
function getPrimitiveTsType(kind: ts.SyntaxKind) {
  let typeString = "others"
  switch(kind) {
    case ts.SyntaxKind.StringKeyword:
      typeString = TypeString.string
      break
    case ts.SyntaxKind.NumberKeyword:
      typeString = TypeString.number
      break
    case ts.SyntaxKind.BooleanKeyword:
      typeString = TypeString.boolean
      break
    case ts.SyntaxKind.UndefinedKeyword:
      typeString = TypeString.undefined
      break
    case ts.SyntaxKind.VoidKeyword:
      typeString = TypeString.void
    default: 
      console.warn("unkown type: " + kind)
  }
  return typeString
}

/**
 * Another implementation.
 *
 * @param {number} kind
 * @returns {string}
 */
function getPrimitiveTsType_(kind: number): string {
  return revertSyntaxKindMap[kind]; 
}

/**
 * Deal and only with decorators which wraps class node.
 *
 * @param {GlobalStorage} globalStore
 * @param {ts.ClassDeclaration} node
 */
function handleClassNode(
  globalStore: GlobalStorage,
  node: ts.ClassDeclaration
) {
  const decorators = node.decorators;

  const className = node.name && node.name.text;

  // All decorators of this class node will be pushed into this list.
  const decoList = [] as DecoratorDescriptor[];
  decorators &&
    decorators.forEach(function(decorator) {
      const describe = handleDecoratorNode(decorator);
      // This step handle inprimitive types.
      postDecoratorDescriptContentHandler(
        describe,
        hanldePropertyAccessContent
      );
      decoList.push(describe);
    });

  if (className) {
    const detailItem = {
      className,
      /**
       * this is the unique mark of the component
       * need to finish, currently use className
       */
      id: className,
      decorators: decoList,
      members: []
    };
    globalStore.push(detailItem);
  }
}

/**
 * NOTE: This should be re-considered because
 * We should get reference from original scripts
 * instead of determine runtime value
 * by the identifier. Because identifier can be a alias
 *
 * So this function currently do nothing.
 *
 * @param {DecoratorDescriptor} describe
 * @returns {DecoratorDescriptor}
 */
function postDecoratorDescriptContentHandler(
  describe: DecoratorDescriptor,
  handler: (value: DecoratorDescriptorAug) => DecoratorDescriptorAug
): DecoratorDescriptor {
  // Traversing descriptor's contents
  describe.augList = describe.augList.map(handler);
  return describe;
}

/**
 * Process raw data of property access statement of AST.
 * The `content.value` passed to this function is transformed into array in early.
 *
 * @param {DecoratorDescriptorAug} content
 */
function hanldePropertyAccessContent(
  content: DecoratorDescriptorAug
): DecoratorDescriptorAug {
  let transformedContent = content;
  if (content.type === "propertyAccessRaw") {
    const entityChain = content.value;
    const value = entityChain.join(".");
    transformedContent = { value, type: "property" };
  }
  return transformedContent;
}

/**
 * Process decorator node of TS AST and return structured node details.
 *
 * @param {ts.Decorator} node
 * @returns {DecoratorDescriptor}
 */
function handleDecoratorNode(node: ts.Decorator): DecoratorDescriptor {
  let structuredAugs: DecoratorDescriptorAug[] = [];
  let decoratorName;
  if (ts.isIdentifier(node.expression)) {
    decoratorName = node.expression.text;
    // content = { type: "null", value: "" };
  } else {
    const expression = node.expression as ts.CallExpression;

    decoratorName = (expression.expression as ts.Identifier).text;

    expression.arguments.map(extractArgument).forEach(content => {
      structuredAugs.push(content);
    });
  }

  return { name: decoratorName, augList: structuredAugs };
}

/**
 * Parse the statement of param in a function invoking.
 *
 * @param {(ts.Expression | undefined)} contentNode
 * @returns {DecoratorDescriptorAug}
 */
function extractArgument(
  contentNode: ts.Expression | undefined
): DecoratorDescriptorAug {
  // ts.Identifier | ts.PropertyAccessExpression | undefined

  let content: DecoratorDescriptorAug;

  if (!contentNode) {
    content = { type: "null" };
  } else {
    switch (contentNode.kind) {
      case ts.SyntaxKind.StringLiteral:
      case ts.SyntaxKind.NumericLiteral:
        content = {
          type: "literal",
          value: (contentNode as ts.LiteralExpression).text
        };
        break;
      case ts.SyntaxKind.Identifier:
        content = {
          type: "identifier",
          value: (contentNode as ts.Identifier).text
        };
        break;
      case ts.SyntaxKind.ObjectLiteralExpression:
        content = {
          type: "object",
          value: getValueFromObjLiteral(
            contentNode as ts.ObjectLiteralExpression
          )
        };
        break;
      case ts.SyntaxKind.PropertyAccessExpression:
        const chain = [] as string[];
        getExpressionReverse(chain, contentNode as ts.PropertyAccessExpression);
        const entityChain = chain.reverse();
        content = { type: "propertyAccessRaw", value: entityChain };
        break;
      default:
        content = { type: "error", value: "unidentified node" };
    }
    // TODO: reflection
  }

  return content;
}

/**
 *
 *
 * @param {ts.ObjectLiteralExpression} node
 * @returns {string}
 */
function getValueFromObjLiteral(node: ts.ObjectLiteralExpression): string {
  // TODO: implements
  const sourceFile = ts.createSourceFile(
    "result.ts",
    "",
    ts.ScriptTarget.ES2015,
    false,
    ts.ScriptKind.TS
  );

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed
  });

  (node as any).multiLine = false;

  const result = printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);

  return result;
}

/**
 * Because the point expressions in TS AST can be nested structured.
 * This function flatten the relationship and return an array of each property.
 *
 * @param {string[]} chain
 * @param {ts.PropertyAccessExpression} node
 */
function getExpressionReverse(
  chain: string[],
  node: ts.PropertyAccessExpression
) {
  chain.push(node.name.text);

  if (!ts.isIdentifier(node.expression)) {
    getExpressionReverse(chain, node.expression as ts.PropertyAccessExpression);
  } else {
    chain.push(node.expression.text);
  }
}
