import {
  GraphQLResolveInfo,
  visitInParallel,
  visitWithTypeInfo,
  TypeInfo,
  visit,
  ASTVisitor,
  ASTNode,
  OperationDefinitionNode,
  FragmentDefinitionNode,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLOutputType,
  FieldNode,
  DocumentNode,
  ArgumentNode,
} from 'graphql';
import { set, unset } from 'lodash';
import { TranslationContext } from './TranslationContext';
import AuthorizationFilterRule from './rules/AuthorizationFilterRule';
import { Path } from 'graphql/jsutils/Path';

export type TranslationRule = (ctx: TranslationContext) => ASTVisitor;
export type AstCoalescer = (astMap: AstMap | null) => any;
export interface AstMap {
  [loc: string]: AstCoalescer;
}
export type ResolveInfo = GraphQLResolveInfo | LimitedResolveInfo;
export interface LimitedResolveInfo {
  readonly schema: GraphQLSchema;
  readonly operation: DocumentNode;
}
export type AuthAction = {
  action: string;
  payload: {
    path?: Array<string | number>;
    node?: ArgumentNode;
  };
};

export function translate(
  params: { [argName: string]: any },
  ctx: any,
  resolveInfo: ResolveInfo,
  rules: TranslationRule[] = [AuthorizationFilterRule], // default to specifiedRules? what to include?
  coalescer: AstCoalescer = coalesce,
  // merge: (oldNode: AstNode, newNode: AstNode) => AstNode,
): any {
  const abortObj = Object.freeze({});
  const typeInfo = new TypeInfo(resolveInfo.schema);
  const documentAST = resolveInfo.operation;
  const queryMap: AstMap = {
    originalQuery: () => documentAST,
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
    },
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
  const requestAst: ASTNode = astMap ? (astMap['originalQuery'] ? astMap.originalQuery(astMap) : {}) : {};
  const authFilters: Array<AuthAction> = astMap ? (astMap['authFilters'] ? astMap.authFilters(astMap) : []) : [];

  authFilters.map((authAction: AuthAction) => {
    switch (authAction.action) {
      case 'SET':
        if (authAction.payload.path && authAction.payload.node)
          set(requestAst, authAction.payload.path, authAction.payload.node);
        break;
      case 'DELETE':
        if (authAction.payload.path) unset(requestAst, authAction.payload.path);
        break;
      case 'SKIP':
      default:
        break;
    }
  });

  return requestAst;
};
