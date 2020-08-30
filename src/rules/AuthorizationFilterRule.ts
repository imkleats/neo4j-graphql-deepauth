// import GraphQL type definitions
import {
  ArgumentNode,
  astFromValue,
  ASTVisitor,
  FieldNode,
  getNamedType,
  isInputType,
  isObjectType,
  valueFromASTUntyped,
} from 'graphql';
import { TranslationContext } from '../TranslationContext';
import { coerceDeepAuthInputValue, getDeepAuthFromType } from '../Utilities';

export default function AuthorizationFilterRule(
  context: TranslationContext, // The TranslationContext class we instantiate in translate().
): ASTVisitor {
  // Returns an ASTVisitor
  return {
    enter: {
      // The Document visitor establishes necessary parts of the
      Document() {
        context.postToAstMap({ loc: 'authFilters', node: () => context.getAuthActions() });
      },

      // The Field visitor assesses whether each field of a selection
      // set needs an augmented filter argument. This visitor must comply
      // to the following requirements:
      //   1) If `Field`'s type has a @deepAuth directive, it needs a
      //      root authorization filter.
      //   2) If `Field` has an exisiting filter argument, that filter
      //      must be augmented to ensure nested filters are compliant.
      //   3) If (1) and (2), then replace existing filter argument with
      //      wrapped `AND [ (1), (2) ]`. If only (1), then add (1) as
      //      filter argument. If only (2), replace filter argument
      //      with (2).
      //   4) If `Field` has neither @deepAuth directive or existing
      //      filter arguments, no updates to AST are needed.
      Field(
        node: FieldNode,
        key: string | number | undefined,
        parent: any,
        path: ReadonlyArray<string | number>,
        ancestors: any,
      ) {
        const fieldType = context.getType();
        const innerType = fieldType ? getNamedType(fieldType) : undefined;
        // Currently does not support Interface or Union types.
        // Check for ObjectTypes that can have @deepAuth directive.
        const filterInputType = isObjectType(innerType)
          // @ts-ignore
          ? context.getSchema().getType(`_${innerType.name}Filter`)
          : undefined;
        const authFilter = isObjectType(innerType) ? getDeepAuthFromType(innerType, context) : undefined;

        // Get user-submitted Filter argument & index of that argument in the Field's Arguments array
        const [existingFilter, argIndex] = node.arguments
          ? node.arguments.reduce<[ArgumentNode | undefined, number]>(
              (accTuple: [ArgumentNode | undefined, number], argNode: ArgumentNode, argIdx: number) => {
                if (accTuple?.[0] === undefined) {
                  // Until a filterArgument is found...
                  if (argNode.name.value === 'filter') {
                    //  Check if argument.value.name is filter
                    return [argNode as ArgumentNode, argIdx]; //  return the argumentNode if it is, and the actual index.
                  } else {
                    //  Else (argument is not filter && filter has not yet been found)
                    return [undefined, argIdx + 1]; //  Keep undefined node, and set Index at idx+1 in case filter never found.
                  }
                }
                return [undefined, accTuple?.[1]]; // If filter has already been found, return the accumulator.
              },
              [undefined, 0],
            )
          : [undefined, 0];

        let authAction;
        if (existingFilter && filterInputType && isInputType(filterInputType)) {
          authAction = {
            // At this point, appropriate action is SET. If other directives need to
            // modify the pre-exisiting Filter argument through a TranslationRule,
            // it might be necessary to use a REPLACE action, which has different behavior
            // to accommodate non-colocated translations.
            action: 'SET',
            payload: {
              node: {
                kind: 'Argument',
                name: { kind: 'Name', value: 'filter' },
                // `value` must be type ValueNode.
                value: astFromValue(
                  coerceDeepAuthInputValue(valueFromASTUntyped(existingFilter.value), filterInputType, context),
                  filterInputType,
                ),
              },
              path: [...path, 'arguments', argIndex],
            },
          };
        } else {
          authAction = authFilter
            ? {
                action: 'SET',
                payload: {
                  node: { kind: 'Argument', name: { kind: 'Name', value: 'filter' }, value: authFilter },
                  path: [...path, 'arguments', argIndex],
                },
              }
            : {
                action: 'SKIP',
                payload: {},
              };
        }
        context.addAuthAction(authAction);
        // The @return value of visitor functions elicit special behavior.
        // In most cases, we just want to return undefined.
      },

      // To deal with nested relationship filters, we moved to applying
      // the directive through `coerceDeepAuthInputValue`, modeled from
      // the reference implementation's `coerceInputValue` function.
      // FYI: This function could be generalized to apply directive-based
      // changes to any other kind of GraphQLInputValue too.
    },
  };
}
