import { GraphQLResolveInfo } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { translate, validateDeepAuthSchema } from '../src';

describe('Schema Validation', () => {
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
  test('should not return an error on validation', () => {
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
    const runValidate = () => {
      try {
        validateDeepAuthSchema(schema);
      } catch (e) {
        // tslint:disable-next-line: no-console
        // console.warn(e);
        throw e;
      }
    };
    expect(runValidate).not.toThrowError();
  });
  test('should return an error on validation if deepAuth path not Object-like', () => {
    const badSdl = `
            type Task @deepAuth(
                path: """visibleTo_some: { name_contains: "$user_id" }""",
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
    const resolvers = {
      Query: {
        tasks: (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
          const testTranslate = translate(args, ctx, { ...resolveInfo, schema: badSchema });
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
    const badSchema = makeExecutableSchema({
      resolvers,
      typeDefs: badSdl,
    });
    const runValidate = () => {
      try {
        validateDeepAuthSchema(badSchema);
      } catch (e) {
        // tslint:disable-next-line: no-console
        // console.warn(e);
        throw e;
      }
    };
    expect(runValidate).toThrowError();
  });

  test('should return an error on validation if deepAuth path has wrong field name', () => {
    const badSdl = `
            type Task @deepAuth(
                path: """{ visibleTo: { name_contains: "$user_id" } }""",
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
    const resolvers = {
      Query: {
        tasks: (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
          const testTranslate = translate(args, ctx, { ...resolveInfo, schema: badSchema });
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
    const badSchema = makeExecutableSchema({
      resolvers,
      typeDefs: badSdl,
    });
    const runValidate = () => {
      try {
        validateDeepAuthSchema(badSchema);
      } catch (e) {
        // tslint:disable-next-line: no-console
        // console.warn(e);
        throw e;
      }
    };
    expect(runValidate).toThrowError();
  });
});
