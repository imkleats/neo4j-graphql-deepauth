# neo4j-graphql-deepauth
Directive-based support for fine-grained access control in `neo4j-graphql-js` GraphQL endpoints (i.e. GRANDstack apps). Also enables support in any non-`neo4j-graphql-js` GraphQL endpoint that exposes a `filter` field argument with nested relational filtering.

## Breaking Changes from the v0.1.0-alpha
In order to reinforce that the `path` argument should be the string representation of a valid `_<Type>Filter` Input corresponding to the ObjectType Definition on which the directive is being applied, the `path` string is no longer wrapped with brackets while processing directive arguments and applying the authorization path to the `filter`. Users upgrading from v0.0.1-alpha should wrap the inner contents of their `path` arguments in brackets as follows:

`path: """ userId: "$user_id" """` would become `path: """{ userId: "$user_id" }"""`.

Apologies for any inconvenience and contradicting a decision made earlier.

## Using the `neo4j-deepauth` package

### 1. Install package via NPM or Yarn
`yarn add neo4j-deepauth` or `npm install neo4j-deepauth`

### 2. Add schema definition for `@deepAuth` directive to your SDL.

Your type definitions should include the following:

```js
const typeDefs = `
  # Other TypeDefs you defined before

  directive @deepAuth(
    path: String
    variables: [String]
  ) on OBJECT
`
```

Note that, under its current implementation, the behavior of `@deepAuth` will only be applied to Objects. Union or Interface types & field-level access control are yet to be implemented.

### 3. Add directive to user-defined types.

Modify your previously-defined type definitions by including `@deepAuth` on any Object you want it to apply to. Using our To-Do example, that might look like:

```js
const typeDefs = `

type User @deepAuth(
  path: """{ OR: [{userId: "$user_id"},
                {friends_some: {userId: "$user_id"}}] }""",
  variables: ["$user_id"]
){
  userId: ID!
  firstName: String
  lastName: String
  email: String!
  friends: [User] @relation(name: "FRIENDS_WITH", direction: "OUT")
  taskList: [Task] @relation(name: "TO_DO", direction: "OUT")
  visibleTasks: [Task] @relation(name: "CAN_READ", direction: "IN")
}

type Task @deepAuth(
  path: """{ visibleTo_some: {userId: "$user_id"} }"""
  variables: ["$user_id"]
) {
  taskId: ID!
  name: String!
  details: String
  location: Point
  complete: Boolean!
  assignedTo: User @relation(name: "TO_DO", direction: "IN")
  visibleTo: [User] @relation(name: "CAN_READ", direction: "OUT")
}

# ...Directive definition from above
`
```

Here we've limited access to Users if: a) the client is the `User`; or b) the client is friends with the `User`. And we've limited access to `Tasks` if and only if the client's `User` has a `CAN_READ` relationship to the `Task`. **This is not the only or best authorization structure, just a simple example.**

Please note that the `path` argument strongly corresponds to the filter argument Input Types that would define the existence of the ACL structure, and the augmented schema can be validated using `validateDeepAuthSchema()` to ensure each `path` corresponds to a valid `_<Type>Filter` Input Type definition (i.e. the schema object you get from running `makeAugmentedSchema` with `neo4j-graphql-js`).  As such, it must be written enclosed by brackets at the outermost level. **This is a change from formerly requiring just `path` not `{ path }`.**

### 4. Modify resolvers and request context

Unless or until `@deepAuth` is integrated as a broader feature into `neo4j-graphql-js`, we will not be able to rely on the automatically-generated resolvers. We will have to modify them ourselves.

Per the [GRANDstack docs](https://grandstack.io/docs/neo4j-graphql-js.html#translate-graphql-to-cypher), "inside each resolver, use neo4j-graphql() to generate the Cypher required to resolve the GraphQL query, passing through the query arguments, context and resolveInfo objects." This would normally look like:

```js
import { neo4jgraphql } from "neo4j-graphql-js";

const resolvers = {
  // entry point to GraphQL service
  Query: {
    User(object, params, ctx, resolveInfo) {
      return neo4jgraphql(object, params, ctx, resolveInfo);
    },
    Task(object, params, ctx, resolveInfo) {
      return neo4jgraphql(object, params, ctx, resolveInfo);
    },
  }
};
```

As alluded to above, we must modify these resolvers to replace the `resolveInfo.operation` and `resolveInfo.fragments` used by `neo4jgraphql()` with the pieces of your transformed query. That might look something like:

```js
import { neo4jgraphql } from "neo4j-graphql-js";
import { applyDeepAuth } from "neo4j-deepauth";

const resolvers = {
  // entry point to GraphQL service
  Query: {
    User(object, params, ctx, resolveInfo) {
      const authResolveInfo = applyDeepAuth(params, ctx, resolveInfo);
      return neo4jgraphql(object, params, ctx, authResolveInfo);
    },
    Task(object, params, ctx, resolveInfo) {
      const authResolveInfo = applyDeepAuth(params, ctx, resolveInfo);
      return neo4jgraphql(object, params, ctx, authResolveInfo);
    },
  }
};
```

If you use any `variables` in your `@deepAuth` directives, you must define them within your request context with the key as it appears in your `variables` argument. Here is an example of how to add values to the `deepAuthParams` in the context using ApolloServer:

```js
const server = new ApolloServer({
  context: ({req}) => ({
    driver,
    deepAuthParams: {
      $user_id: req.user.id
    }
  })
})
```

### 5. Update Custom Mutations
The automatically-generated mutations will not currently respect or enforce the authorization paths provided on `@deepAuth`. Also, it will often be helpful or necessary to create/delete additional authorization nodes/relationships in the same transaction as a `Create`/`Delete` mutation.

For these reasons, you will need to create your own custom mutation resolvers for pretty much any Type that has `@deepAuth` applied or has a relationship to a `@deepAuth`ed Type.

## Design Goals & Thought Process
As `neo4j-deepauth` was being developed, a series of articles was posted to [Dev.to](https://dev.to) explaining the motivation behind this package and some of the design choices that were made. You can find them here: [Access Control with GRANDstack](https://dev.to/imkleats/series/5036)

## Example
An example of `neo4j-deepauth` use can be found at [github.com/imkleats/neo4j-deepauth-example](https://github.com/imkleats/neo4j-deepauth-example)