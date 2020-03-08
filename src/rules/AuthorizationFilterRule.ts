// import GraphQL type definitions
import {
  ASTVisitor,
  ASTNode,
  getNamedType,
  isObjectType,
  DirectiveNode,
  StringValueNode,
  ListValueNode,
  ArgumentNode,
  parse,
  FieldNode,
} from 'graphql';
import { TranslationContext } from '../TranslationContext';

export default function AuthorizationFilterRule(
  context: TranslationContext, // The TranslationContext class we instantiate in translate().
): ASTVisitor {
  // Returns an ASTVisitor
  return {
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
      const ToDoList = `
        1a) Check for directive on field's type in schema.
        1b) Check for filter arguments on Field node.
        2a) Modify or remove existing filter arguments.
        2b) If 1a is true, wrap 2a with the ACL filter.
        3)  Discern appropriate path for new/modified filter arguments.
        4a) Get current authFilters list from AstMap using 'context'.
        4b) Append object with {path: results_of_3, node: results_of_2}
            to 4a (with a higher order function or something similar).
        4c) Post result of 4b to AstMap using 'context'.
      `;

      function populateArgsInPath(path: string, args: string[]): string {
        const ctxParams = context.fromRequestContext('deepAuthParams');
        const populatedPath = args.reduce((acc: string, param: string) => {
          return acc.replace(param, ctxParams[param]);
        }, path);
        return populatedPath;
      }

      function parseAuthFilter(query: string): ArgumentNode | undefined {
        const ast = parse(`{ q(filter: {${query})} }`);
        // Filter arguments will be at the following address:
        // [ 'definitions', 0, 'selectionSet', 'selections', 0, 'arguments', 0 ]
        let filterArg;
        if (
          ast.definitions[0].kind == 'OperationDefinition' &&
          ast.definitions[0].selectionSet.selections[0].kind == 'Field' &&
          ast.definitions[0].selectionSet.selections[0].arguments
        ) {
          filterArg = ast.definitions[0].selectionSet.selections[0].arguments[0];
        }
        // If query is a blank string, it will return an ObjectValue with fields: [].
        // return undefined if [], else return filterArg
        return filterArg
          ? filterArg.value.kind == 'ObjectValue' && filterArg.value.fields.length > 0
            ? filterArg
            : undefined
          : filterArg;
      }

      const fieldType = context.getType();
      const innerType = fieldType ? getNamedType(fieldType) : undefined;

      let authFilter;

      // Currently does not support Interface or Union types.
      // Check for ObjectTypes that can have @deepAuth directive.
      if (isObjectType(innerType)) {
        const typeDirectives = innerType.astNode ? innerType.astNode.directives : undefined;
        const authDirective = typeDirectives
          ? typeDirectives.filter((directive: DirectiveNode) => directive.name.value === 'deepAuth')
          : undefined;
        const authArgs = authDirective && authDirective.length > 0 ? authDirective[0].arguments : undefined;
        const authConfig = authArgs
          ? authArgs.reduce((acc: any, arg) => {
              switch (arg.name.value) {
                case 'path':
                  if (arg.value.kind == 'StringValue') {
                    acc.path = arg.value.value;
                  }
                  break;
                case 'variables':
                  let authVariables = [];
                  if (arg.value.kind == 'ListValue') {
                    arg.value.values.map(varArg => {
                      if (varArg.kind == 'StringValue') authVariables.push(varArg.value);
                    });
                  }
                  break;
              }
              return acc;
            }, {})
          : undefined;

        const authQuery = authConfig ? populateArgsInPath(authConfig.path, authConfig.variables) : undefined;
        if (authQuery) authFilter = parseAuthFilter(authQuery);
      }

      const [existingFilter, argIndex] = node.arguments
        ? node.arguments.reduce(
            (
              [filterArg, argumentIndex]: Array<ArgumentNode | undefined | number>,
              argNode: ArgumentNode,
              argIdx: number,
            ) => {
              if (filterArg === undefined) {
                // Until a filterArgument is found...
                if (argNode.name.value == 'filter') {
                  //  Check if argument.value.name is filter
                  return [argNode, argIdx]; //  return the argumentNode if it is, and the actual index.
                } else {
                  //  Else (argument is not filter && filter has not yet been found)
                  return [filterArg, argIdx + 1]; //  Keep undefined node, and set Index at idx+1 in case filter never found.
                }
              }
              return [filterArg, argumentIndex]; // If filter has already been found, return the accumulator.
            },
            [undefined, 0],
          )
        : [undefined, 0];

      let authAction;
      if (authFilter) {
        authAction = {
          action: 'SET',
          payload: {
            path: [...path, 'arguments', argIndex],
            node: authFilter,
          },
        };
      } else {
        // Until nested filter transformations can be implemented,
        // this will submit an action to delete the filter Argument.
        authAction = existingFilter
          ? {
              action: 'DELETE',
              payload: {
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

    // To deal with nested filters, we can also leverage the native
    // recursion of `visit()`. This would potentially use visitors
    // for `Argument`, `ListValue`, `ObjectValue`, and `ObjectField`.
    ObjectField(
      node: ASTNode,
      key: string | number | undefined,
      parent: any,
      path: ReadonlyArray<string | number>,
      ancestors: any,
    ) {
      const ToDoList = `
         1) Check if child of 'filter' Argument.
            how: Use index of 'arguments' in 'path' array. Argument node
                 will be at index+2 in 'ancestors' array.
            yes? Proceed to 2
            no?  return undefined (to proceed with visitation)
         2) Return undefined if node.name.value is a logical operator (AND, OR).
         3) Process 'node.name.value' to be able to get TypeInfo for the filter
            argument component.
         4) If (3) indicates type is subject to @deepAuth, wrap the ObjectField
            with the relevant root authorization filter for that type using AND.
      `;
    },
  };
}
