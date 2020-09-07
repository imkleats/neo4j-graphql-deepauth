// import GraphQL type definitions
import {
  ArgumentNode,
  astFromValue,
  ASTVisitor,
  FieldNode,
  getNamedType,
  isInputType,
  isInterfaceType,
  isObjectType,
  valueFromASTUntyped,
} from 'graphql';
import { TranslationContext } from '../TranslationContext';
import {
  coerceDeepAuthInputValue,
  getDeepAuthFromConfig,
  getDeepAuthFromInterfaceType,
  getDeepAuthFromType,
  getExistingFilter,
  deepAuthArgumentReducer,
} from '../Utilities';

export default function AuthorizationFilterRule(
  context: TranslationContext, // The TranslationContext class we instantiate in translate().
): ASTVisitor {
  // Returns an ASTVisitor
  return {
    enter: {
      // The Document visitor establishes necessary parts of the
      Document() {
        context.postToAstMap({ loc: 'authFilters', node: () => context.getAuthActions() });
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(context.getFilterMap(), null, 2));
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
        // Check if Field Definition contains a
        const fieldDef = context.getFieldDef()?.astNode?.directives?.find(dir => dir.name.value === 'deepAuth');
        const fieldAuthConfig =
          fieldDef && fieldDef.arguments?.reduce(deepAuthArgumentReducer, { path: '', variables: [], filterInput: '' });
        const [fieldAuthFilter, fieldFilterInputType] = fieldAuthConfig
          ? getDeepAuthFromConfig(fieldAuthConfig, context)
          : [undefined, undefined];

        const fieldType = context.getType();
        const innerType = fieldType ? getNamedType(fieldType) : undefined;
        // Currently does not support Union types.
        // Check for Object & Interface Types that can have @deepAuth directive.
        const filterInputType = fieldFilterInputType ?? context.getFilterFromTypeName(innerType?.name ?? ''); // context.getSchema().getType(`_${innerType?.name}Filter`);
        const authFilter =
          fieldAuthFilter ??
          (isObjectType(innerType)
            ? getDeepAuthFromType(innerType, context)
            : isInterfaceType(innerType)
            ? getDeepAuthFromInterfaceType(innerType, context)
            : undefined);

        // Get user-submitted Filter argument & index of that argument in the Field's Arguments array
        const [existingFilter, argIndex] = getExistingFilter(node) ?? [undefined, 0];

        let authAction;
        if (existingFilter && isInputType(filterInputType)) {
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
