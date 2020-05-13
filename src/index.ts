import {
  ArgumentNode,
  ASTNode,
  ASTVisitor,
  DocumentNode,
  FragmentDefinitionNode,
  GraphQLResolveInfo,
  GraphQLSchema,
  OperationDefinitionNode,
  TypeInfo,
  visit,
  visitInParallel,
  visitWithTypeInfo,
} from 'graphql';
import { set, unset } from 'lodash';
import AuthorizationFilterRule from './rules/AuthorizationFilterRule';
import { TranslationContext } from './TranslationContext';

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
export interface AuthAction {
  action: string;
  payload: {
    path?: Array<string | number>;
    node?: ArgumentNode;
  };
}

export function translate(
  params: { [argName: string]: any },
  ctx: any,
  resolveInfo: GraphQLResolveInfo,
  rules: TranslationRule[] = [AuthorizationFilterRule], // default to specifiedRules? what to include?
  coalescer: AstCoalescer = coalesce,
  // merge: (oldNode: AstNode, newNode: AstNode) => AstNode,
): any {
  const abortObj = Object.freeze({});
  const typeInfo = new TypeInfo(resolveInfo.schema);

  const frags = [];
  for (const defn in resolveInfo.fragments) {
    if (resolveInfo.fragments.hasOwnProperty(defn)) {
      frags.push(resolveInfo.fragments[defn]);
    }
  }
  const documentAST: DocumentNode = {
    kind: 'Document',
    // tslint:disable-next-line: object-literal-sort-keys
    definitions: [resolveInfo.operation, ...frags],
  };

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
  const requestAst: ASTNode = astMap ? (astMap.originalQuery ? astMap.originalQuery(astMap) : {}) : {};
  const authFilters: AuthAction[] = astMap ? (astMap.authFilters ? astMap.authFilters(astMap) : []) : [];

  authFilters.map((authAction: AuthAction) => {
    switch (authAction.action) {
      case 'SET':
        if (authAction.payload.path && authAction.payload.node) {
          set(requestAst, authAction.payload.path, authAction.payload.node);
        }
        break;
      case 'REPLACE':
        if (authAction.payload.path && astMap?.[authAction.payload.path.join('.')]) {
          const nodeFn = astMap[authAction.payload.path.join('.')];
          const node = nodeFn(astMap);
          if (node) {
            set(requestAst, authAction.payload.path, node);
          }
        }
      case 'DELETE':
        if (authAction.payload.path) {
          unset(requestAst, authAction.payload.path);
        }
        break;
      case 'SKIP':
      default:
        break;
    }
  });

  return requestAst;
};

export function applyDeepAuth(
  params: { [argName: string]: any },
  ctx: any,
  resolveInfo: GraphQLResolveInfo,
  rules: TranslationRule[] = [AuthorizationFilterRule], // default to specifiedRules? what to include?
  coalescer: AstCoalescer = coalesce,
  // merge: (oldNode: AstNode, newNode: AstNode) => AstNode,
): GraphQLResolveInfo {
  const transformedDocument: DocumentNode = translate(params, ctx, resolveInfo, rules, coalescer);
  const { operation, fragments } = transformedDocument.definitions.reduce(
    (acc: { operation: OperationDefinitionNode; fragments: { [key: string]: FragmentDefinitionNode } }, defn) => {
      if (defn.kind === 'OperationDefinition') {
        acc.operation = defn;
      }
      if (defn.kind === 'FragmentDefinition') {
        acc.fragments[defn.name.value] = defn;
      }
      return acc;
    },
    { operation: resolveInfo.operation, fragments: resolveInfo.fragments },
  );
  return {
    ...resolveInfo,
    fragments,
    operation,
  };
}
