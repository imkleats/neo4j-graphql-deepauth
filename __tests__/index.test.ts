import { graphql, GraphQLResolveInfo, NameNode } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { translate } from '../src';

describe('ResolveInfo Fragments', () => {
  const sdl = `
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
        type Query {
            tasks(filter: _TaskFilter): [Task]
        }

        input _TaskInput {
            name: String
            order: [Int]
        }
        
        input _TaskFilter {
            AND: [_TaskFilter]
            name: String
            visibleTo_some: _UserFilter
        }

        input _UserFilter {
            name_contains: String
        }

        directive @deepAuth(
            path: String
            variables: [String]
        ) on OBJECT | FIELD_DEFINITION
    `;
  test('should return a non-error graphql response', () => {
    const resolvers = {
      Query: {
        tasks: (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
          const testTranslate = translate(args, ctx, { ...resolveInfo, schema });
          return [
            {
              name: 'Build Tests',
              order: [0, 1, 2, 3],
            },
            {
              name: 'More Tests',
              order: [4, 5, 6, 7],
            },
          ];
        },
      },
    };

    const schema = makeExecutableSchema({
      resolvers,
      typeDefs: sdl,
    });

    const queryA = `
        query {
            tasks(filter: { name: "Groot" }) {
                name
                order
            }
        }
        `;
    return graphql(schema, queryA, null, {
      deepAuthSchema: schema,
      // tslint:disable-next-line: object-literal-sort-keys
      deepAuthParams: {
        $user_id: 'Groot',
      },
    }).then(response => {
      expect(response).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            tasks: expect.arrayContaining([
              expect.objectContaining({
                name: expect.stringMatching('Build Test'),
                order: expect.arrayContaining([0, 1, 2, 3]),
              }),
              expect.objectContaining({
                name: expect.stringMatching('More Tests'),
                order: expect.arrayContaining([4, 5, 6, 7]),
              }),
            ]),
          }),
        }),
      );
    });
  });

  test('should include authorization path', () => {
    const resolvers = {
      Query: {
        tasks: (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
          const testTranslate = translate(args, ctx, { ...resolveInfo, schema });
          expect(testTranslate).toHaveProperty(['definitions', 0, 'selectionSet', 'selections', 0, 'arguments', 0]);
          expect(testTranslate.definitions[0].selectionSet.selections[0].arguments[0]).toEqual(
            expect.objectContaining({
              kind: 'Argument',
              name: expect.objectContaining<NameNode>({
                kind: 'Name',
                value: 'filter',
              }),
              value: expect.objectContaining({
                kind: 'ObjectValue',
                // tslint:disable-next-line: object-literal-sort-keys
                fields: expect.arrayContaining([
                  expect.objectContaining({
                    kind: 'ObjectField',
                    name: expect.objectContaining({
                      kind: 'Name',
                      value: 'visibleTo_some',
                    }),
                    value: expect.objectContaining({
                      kind: 'ObjectValue',
                      // tslint:disable-next-line: object-literal-sort-keys
                      fields: expect.arrayContaining([
                        expect.objectContaining({
                          kind: 'ObjectField',
                          name: expect.objectContaining({
                            kind: 'Name',
                            value: 'name_contains',
                          }),
                          value: expect.objectContaining({
                            kind: 'StringValue',
                            value: 'Groot',
                          }),
                        }),
                      ]),
                    }),
                  }),
                ]),
              }),
            }),
          );
          return [
            {
              name: 'Build Tests',
              order: [0, 1, 2, 3],
            },
            {
              name: 'More Tests',
              order: [4, 5, 6, 7],
            },
          ];
        },
      },
    };

    const schema = makeExecutableSchema({
      resolvers,
      typeDefs: sdl,
    });

    const queryA = `
        query {
            tasks {
                name
                order
            }
        }
        `;
    return graphql(schema, queryA, null, {
      deepAuthSchema: schema,
      // tslint:disable-next-line: object-literal-sort-keys
      deepAuthParams: {
        $user_id: 'Groot',
      },
    }).then(response => {
      // tslint:disable-next-line: no-console
      // console.log(JSON.stringify(response, undefined, 2));
      expect(response).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            tasks: expect.arrayContaining([
              expect.objectContaining({
                name: expect.stringMatching('Build Test'),
                order: expect.arrayContaining([0, 1, 2, 3]),
              }),
              expect.objectContaining({
                name: expect.stringMatching('More Tests'),
                order: expect.arrayContaining([4, 5, 6, 7]),
              }),
            ]),
          }),
        }),
      );
    });
  });

  test('should to not remove previous user-submitted filter when applying auth', () => {
    const resolvers = {
      Query: {
        tasks: (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
          const testTranslate = translate(args, ctx, { ...resolveInfo, schema });
          expect(testTranslate).toHaveProperty(['definitions', 0, 'selectionSet', 'selections', 0, 'arguments', 0]);
          expect(testTranslate?.definitions[0]?.selectionSet?.selections?.[0]?.arguments?.[0]).toEqual(
            expect.objectContaining({
              kind: 'Argument',
              name: expect.objectContaining<NameNode>({
                kind: 'Name',
                value: 'filter',
              }),
              value: expect.objectContaining({
                kind: 'ObjectValue',
                // tslint:disable-next-line: object-literal-sort-keys
                fields: expect.arrayContaining([
                  expect.objectContaining({
                    kind: 'ObjectField',
                    name: expect.objectContaining({
                      kind: 'Name',
                      value: 'AND',
                    }),
                    value: expect.objectContaining({
                      kind: 'ListValue',
                      values: expect.arrayContaining([
                        expect.objectContaining({
                          kind: 'ObjectValue',
                          // tslint:disable-next-line: object-literal-sort-keys
                          fields: expect.arrayContaining([
                            expect.objectContaining({
                              kind: 'ObjectField',
                              name: expect.objectContaining({
                                kind: 'Name',
                                value: 'name',
                              }),
                              value: expect.objectContaining({
                                kind: 'StringValue',
                                value: 'Groot',
                              }),
                            }),
                          ]),
                        }),
                      ]),
                    }),
                  }),
                ]),
              }),
            }),
          );
          return [
            {
              name: 'Build Tests',
              order: [0, 1, 2, 3],
            },
            {
              name: 'More Tests',
              order: [4, 5, 6, 7],
            },
          ];
        },
      },
    };

    const schema = makeExecutableSchema({
      resolvers,
      typeDefs: sdl,
    });

    const queryA = `
        query {
            tasks(filter: { name: "Groot" }) {
                name
                order
            }
        }
        `;
    return graphql(schema, queryA, null, {
      deepAuthSchema: schema,
      // tslint:disable-next-line: object-literal-sort-keys
      deepAuthParams: {
        $user_id: 'Groot',
      },
    }).then(response => {
      expect(response).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            tasks: expect.arrayContaining([
              expect.objectContaining({
                name: expect.stringMatching('Build Test'),
                order: expect.arrayContaining([0, 1, 2, 3]),
              }),
              expect.objectContaining({
                name: expect.stringMatching('More Tests'),
                order: expect.arrayContaining([4, 5, 6, 7]),
              }),
            ]),
          }),
        }),
      );
    });
  });

  test('should still have authorization filter on merge with user-submitted filter', () => {
    const resolvers = {
      Query: {
        tasks: (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
          const testTranslate = translate(args, ctx, { ...resolveInfo, schema });
          expect(testTranslate).toHaveProperty(['definitions', 0, 'selectionSet', 'selections', 0, 'arguments', 0]);
          expect(
            testTranslate.definitions[0].selectionSet.selections[0].arguments[0].value.fields[0].value.values[0]
              .fields[0],
          ).toEqual(
            expect.objectContaining({
              kind: 'ObjectField',
              name: expect.objectContaining({
                kind: 'Name',
                value: 'visibleTo_some',
              }),
              value: expect.objectContaining({
                kind: 'ObjectValue',
                // tslint:disable-next-line: object-literal-sort-keys
                fields: expect.arrayContaining([
                  expect.objectContaining({
                    kind: 'ObjectField',
                    name: expect.objectContaining({
                      kind: 'Name',
                      value: 'name_contains',
                    }),
                    value: expect.objectContaining({
                      kind: 'StringValue',
                      value: 'Groot',
                    }),
                  }),
                ]),
              }),
            }),
          );
          return [
            {
              name: 'Build Tests',
              order: [0, 1, 2, 3],
            },
            {
              name: 'More Tests',
              order: [4, 5, 6, 7],
            },
          ];
        },
      },
    };

    const schema = makeExecutableSchema({
      resolvers,
      typeDefs: sdl,
    });

    const queryA = `
        query {
            tasks(filter: { name: "Groot" }) {
                name
                order
            }
        }
        `;
    return graphql(schema, queryA, null, {
      deepAuthSchema: schema,
      // tslint:disable-next-line: object-literal-sort-keys
      deepAuthParams: {
        $user_id: 'Groot',
      },
    }).then(response => {
      expect(response).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            tasks: expect.arrayContaining([
              expect.objectContaining({
                name: expect.stringMatching('Build Test'),
                order: expect.arrayContaining([0, 1, 2, 3]),
              }),
              expect.objectContaining({
                name: expect.stringMatching('More Tests'),
                order: expect.arrayContaining([4, 5, 6, 7]),
              }),
            ]),
          }),
        }),
      );
    });
  });
});
