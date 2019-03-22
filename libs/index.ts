/// <reference path="../types/others.d.ts" />

import parser2 from "html-parse-stringify2";
import { getMetaData } from "./decoratorParser";

interface HtmlParsedNode {
  name: string;
  children?: HtmlParsedNode[]
  content: string;
}


/**
 * This function may not work properly in some situations.
 * Need to be considered precisely.
 * Maybe change the implementation.
 *
 * @param content
 * @returns
 */
export function genScriptContentFromVueLikeRawText(content: string): string {
  const ast = parser2.parse(content);

  const script = ast
    .filter((node: HtmlParsedNode) => {
      return node.name === "script";
    })
    .map((node: HtmlParsedNode) => {
      return node.children![0].content;
    });

  return script[0];
}


/**
 * Get meta straightly from ts content.
 *
 * @param {string} content
 * @returns
 */
export function genMetaDataFromTsScript(content: string) {
  return getMetaData(content);
}