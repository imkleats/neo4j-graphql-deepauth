import { ASTVisitor, FieldNode, getNamedType, isObjectType, OperationDefinitionNode, SelectionSetNode } from 'graphql';
import { CypherNode, Match, Pattern, Query, Return, Where } from '../cypher';
import { TranslationContext } from '../TranslationContext';

export default function BuildQueryRule(context: TranslationContext): ASTVisitor {
  return {
    enter: {
      OperationDefinition(
        node: OperationDefinitionNode,
        key: string | number | undefined,
        parent: any,
        path: ReadonlyArray<string | number>,
        ancestors: any,
      ) {
        context.setState({
          operation: node.operation,
        });
      },
      SelectionSet(
        node: SelectionSetNode,
        key: string | number | undefined,
        parent: any,
        path: ReadonlyArray<string | number>,
        ancestors: any,
      ) {
        context.setState({
          isRootSelection: parent?.kind === 'OperationDefinition',
          selectionParentPath: path.slice(0, -1),
        });
        if (parent?.kind !== 'OperationDefinition') {
          // Post up to collect Selections
          context.postToAstMap({
            loc: path.join('.'),
            node: astMap => {
              return node.selections.map((val, idx) => {
                const opPath = [...path, idx].join('.');
                return astMap?.[opPath]?.(astMap);
              });
            },
          });
        }
      },
      Field(
        node: FieldNode,
        key: string | number | undefined,
        parent: any,
        path: ReadonlyArray<string | number>,
        ancestors: any,
      ) {
        const state = context.currentState();
        const pathString = path.join('.');

        if (state?.isRootSelection && state?.operation === 'query') {
          // This field is the start of
          // a new cypher query.
          context.postToAstMap({
            loc: path.join('.'),
            node: astMap => {
              const matchClauses = astMap?.[pathString + '--matchClauses']?.(astMap);
              const whereClauses = astMap?.[pathString + '--whereClauses']?.(astMap);
              const returnClauses = astMap?.[pathString + '--returnClauses']?.(astMap);
              return Query(matchClauses, whereClauses, returnClauses);
            },
          });
        }
      },
    },
    leave: {},
  };
}
