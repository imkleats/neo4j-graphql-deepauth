import { GraphQLResolveInfo, visitInParallel, visitWithTypeInfo, TypeInfo, visit, ASTVisitor } from 'graphql';
import { TranslationContext } from './TranslationContext';

export type TranslationRule = (ctx: TranslationContext) => ASTVisitor;
export type AstCoalescer = (AstMap) => any | () => any;
export interface AstMap {[loc: string]: AstCoalescer;};

export function translate(
  params: { [argName: string]: any },
  ctx: any,
  resolveInfo: GraphQLResolveInfo,
  rules: TranslationRule[], // default to specifiedRules? what to include?
  coalescer: AstCoalescer = coalesce,
  // merge: (oldNode: AstNode, newNode: AstNode) => AstNode,
): AstNode {
  const abortObj = Object.freeze({});
  const typeInfo = new TypeInfo(resolveInfo.schema);
  const documentAST = resolveInfo.operation;
  const queryMap: AstMap = {
    'originalQuery': () => documentAST
  };
  
  const context = new TranslationContext(
      params,
      ctx,
      resolveInfo, 
      typeInfo, 
      astPost => {
         queryMap[astPost.loc] = astPost.node;
      },
      astGet => {
         return queryMap[astGet];
      }
  );

  // This uses a specialized visitor which runs multiple visitors in parallel,
  // while maintaining the visitor skip and break API.
  const visitor = visitInParallel(rules.map(rule => rule(context)));

  // Visit the whole document with each instance of all provided rules.
  try {
    visit(documentAST, visitWithTypeInfo(typeInfo, visitor));
  } catch (e) {
    if (e !== abortObj) {
      throw e;
    }
  }
  const translatedAst = coalescer(queryMap);
  return translatedAst;
}

export const coalesce: AstCoalescer = astMap => {
  const requestAst = astmap['originalQuery'] ? astmap.originalQuery() : {};
  const authFilters = astmap['authFilters'] ? astmap.authFilters() : [];

  authFilters.map( authFilter => set(requestAst, authFilter.path, authFilter.node) );

  return requestAst;
};
