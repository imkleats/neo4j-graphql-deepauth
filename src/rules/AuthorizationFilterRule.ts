// import GraphQL type definitions
import { ASTVisitor, ASTNode } from 'graphql';
import { TranslationContext } from '../TranslationContext';

export default function AuthorizationFilterRule(
  context: TranslationContext, // The TranslationContext class we instantiate in translate().
): ASTVisitor {
  // Returns an ASTVisitor
  return {
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
      node: ASTNode,
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
