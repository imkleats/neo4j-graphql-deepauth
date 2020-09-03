import { ExecutionResult, graphql, GraphQLResolveInfo } from 'graphql';
// tslint:disable-next-line: no-var-requires
const { makeAugmentedSchema } = require('neo4j-graphql-js');

export function runTestThroughResolver(
  typeDefs: string,
  query: string,
  context: any,
  typeName: string,
  mockReturn: any,
  testFn: (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => void,
): Promise<ExecutionResult> {
  const resolvers = resolverShell(typeName, mockReturn, testFn);
  const schema = makeAugmentedSchema({
    resolvers,
    typeDefs,
  });
  return graphql(schema, query, null, context);
}

export const goodQuery = `
query {
    Task(filter: { name: "Groot" }) {
        name
        order
    }
}
`;

export const goodResponse = {
  data: {
    Task: [
      {
        name: 'Build Tests',
        order: [0, 1, 2, 3],
      },
      {
        name: 'More Tests',
        order: [4, 5, 6, 7],
      },
    ],
  },
};

export const goodTypeDefs = `
    type Task @deepAuth(
        path: """{ visibleTo_some: { name_contains: "$user_id" } }""",
        variables: ["$user_id"]
    ) {
        name: String
        order: [Int]
        visibleTo: [User]
    }
    type User {
        name: String
    }
    directive @deepAuth(
        path: String
        variables: [String]
    ) on OBJECT | FIELD_DEFINITION
`;

export const goodContext = {
  deepAuthParams: {
    $user_id: 'Groot',
  },
};

export function resolverShell(
  typeName: string,
  mockReturn: any,
  testFn: (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => void,
) {
  const Query: { [resolverName: string]: any } = {};
  Query[typeName] = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
    testFn(object, args, ctx, resolveInfo);
    return mockReturn.data[typeName];
  };
  return {
    Query,
  };
}
