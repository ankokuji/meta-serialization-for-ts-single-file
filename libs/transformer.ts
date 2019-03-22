// Used to transform ts like vue component declaration into normal object literal type
// declaration.

import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";
import * as lodash from "lodash";
import chalk from "chalk";

interface ClassExtractDescription {
  data: ts.PropertyAssignment[];
  methods: ts.MethodDeclaration[];
  beforeCreated?: ts.MethodDeclaration;
  created?: ts.MethodDeclaration;
  mounted?: ts.MethodDeclaration;
}

const classExtractDescription: ClassExtractDescription = {
  data: [],
  methods: []
};

const code = fs
  .readFileSync(path.join(__dirname, "../src/classExample.ts"))
  .toString();

getAstFromTsClassDeclaration(classExtractDescription, code);

const transformedCode = makeVueLikeExportComponent(classExtractDescription);

console.log(chalk.blue(code));
console.log(chalk.green(transformedCode));

function getAstFromTsClassDeclaration(
  classExtractDescription: ClassExtractDescription,
  code: string
) {
  // const esAst = esprima.parseScript(code);

  const tsAst = ts.createSourceFile(
    "haha",
    code,
    ts.ScriptTarget.ES2015,
    false,
    ts.ScriptKind.JS
  );

  const curriedGetPropertyAndMethodDeclaration = lodash.curry(
    getPropertyAssignmentAndMethodDeclaration
  )(classExtractDescription);

  function traverse(node: ts.Node) {
    if (ts.isClassDeclaration(node)) {
      node.members.forEach(member => {
        curriedGetPropertyAndMethodDeclaration(member);
      });
    }

    ts.forEachChild(node, traverse);
  }

  traverse(tsAst);
}

function getPropertyAssignmentAndMethodDeclaration(
  classExtractDescription: ClassExtractDescription,
  classEle: ts.ClassElement
) {
  if (ts.isMethodDeclaration(classEle)) {
    // method declaration
    // const name = (classEle.name as ts.Identifier).text;
    classExtractDescription.methods.push(classEle);
  } else if (ts.isPropertyDeclaration(classEle)) {
    // property declaration

    // TODO: there is a special case that the initializer of property is a method declaration
    //  and how it should be converted determined by the way vue.js treating it
    const pa = getPropertyAssignmentFromPropertyDeclaration(classEle);
    pa && classExtractDescription.data.push(pa);
  }
}

function getPropertyAssignmentFromPropertyDeclaration(
  classEle: ts.PropertyDeclaration
): ts.PropertyAssignment | undefined {
  const name = (classEle.name as ts.Identifier).text;
  let value = classEle.initializer;
  if (!value) {
    value = ts.createIdentifier("undefined");
  }
  return ts.createPropertyAssignment(name, value);
}

function makeVueLikeExportComponent(
  classExtractDescription: ClassExtractDescription
): string {
  const resultFile = ts.createSourceFile(
    "targetFile.ts",
    "",
    ts.ScriptTarget.ES5,
    false,
    ts.ScriptKind.TS
  );

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed
  });

  const result = printer.printNode(
    ts.EmitHint.Unspecified,
    getVueExportAssignment(classExtractDescription),
    resultFile
  );

  return result;
}

function getVueExportAssignment(
  classExtractDescription: ClassExtractDescription
): ts.ExportAssignment {
  const dataProp = createDataProperty(classExtractDescription.data);

  const methoddProp = createMethoddProperty(classExtractDescription.methods);

  const vueObjDec = ts.createObjectLiteral([dataProp, methoddProp], true);
  // ts.createPropertyAssignment()
  return ts.createExportAssignment(undefined, undefined, false, vueObjDec);
}

function createDataProperty(
  property: ReadonlyArray<ts.ObjectLiteralElementLike>
): ts.MethodDeclaration {
  const returnValue = ts.createObjectLiteral(property, true);
  const rturn = ts.createReturn(returnValue);
  const block = ts.createBlock([rturn], true);

  return ts.createMethod(
    undefined,
    undefined,
    undefined,
    "data",
    undefined,
    undefined,
    [],
    undefined,
    block
  );
}

function createMethoddProperty(
  property: ts.MethodDeclaration[]
): ts.PropertyAssignment {
  // filter modifiers like private...
  const filteredProperty = property.map((prop) => {
    prop.modifiers = undefined;
    return prop;
  });

  const objLiteral = ts.createObjectLiteral(filteredProperty, true);
  return ts.createPropertyAssignment("methods", objLiteral);
}
