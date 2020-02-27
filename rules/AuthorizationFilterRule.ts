// import GraphQL type definitions

type TranslationRule = (ctx: TranslationContext) => ASTVisitor;

export default function AuthorizationFilterRule: TranslationRule (
  context: TranslationContext   // The TranslationContext class we instantiate in translate().
) {
  // Returns an ASTVisitor
  return {
    Field(node, key, parent, path, ancestors) {

      const ToDoList = """
         1a) Check for directive on field's type in schema.
         1b) Check for filter arguments on Field node.
         2a) Modify or remove existing filter arguments.
         2b) If 1a is true, wrap 2a with the ACL filter.
         3)  Discern appropriate path for new/modified filter arguments.
         4a) Get current authFilters list from AstMap using `context`.
         4b) Append object with {path: results_of_3, node: results_of_2}
             to 4a (with a higher order function or something similar).
         4c) Post result of 4b to AstMap using `context`.
      """;

      // The @return value of visitor functions elicit special behavior.
      // In most cases, we just want to return undefined.
    }
  }
}
