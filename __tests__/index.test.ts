import { graphql, GraphQLResolveInfo, DocumentNode, NameNode } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { translate } from '../src'

describe('ResolveInfo Fragments', () =>{
    test('should return', ()=>{
        const sdl = `
            type Task @deepAuth(
                path: """visibleTo_some: {name_contains: "$user_id"}""",
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
                tasks(filter: _TaskInput): [Task]
            }

            input _TaskInput {
                name: String
                order: [Int]
            }

            directive @deepAuth(
                path: String
                variables: [String]
            ) on OBJECT | FIELD_DEFINITION
        `;
        const resolvers = {
            Query: {
                tasks: (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
                    const testTranslate = translate(args, ctx, resolveInfo);
                    console.log(testTranslate.definitions[0].selectionSet.selections[0].arguments[0].value.fields[0].value.fields[0]);
                    expect(testTranslate).toHaveProperty(['definitions', 0, 'selectionSet', 'selections', 0, 'arguments', 0]);
                    expect(testTranslate.definitions[0].selectionSet.selections[0].arguments[0])
                        .toEqual(
                            expect.objectContaining({
                                kind: 'Argument',
                                name: expect.objectContaining<NameNode>({
                                    kind: 'Name',
                                    value: 'filter'
                                }),
                                value: expect.objectContaining({
                                    kind: 'ObjectValue',
                                    fields: expect.arrayContaining([
                                        expect.objectContaining({
                                            kind: 'ObjectField',
                                            name: expect.objectContaining({
                                                kind: 'Name',
                                                value: 'visibleTo_some'
                                            }),
                                            value: expect.objectContaining({
                                                kind: 'ObjectValue',
                                                fields: expect.arrayContaining([
                                                    expect.objectContaining({
                                                        kind: 'ObjectField',
                                                        name: expect.objectContaining({
                                                            kind: 'Name',
                                                            value: 'name_contains'
                                                        }),
                                                        value: expect.objectContaining({
                                                            kind: 'StringValue',
                                                            value: 'Groot'
                                                        })
                                                    })
                                                ])
                                            })
                                        })
                                    ])
                                })
                            })
                        )
                    return [
                        {
                            name: 'Build Tests',
                            order: [0, 1, 2, 3]
                        },
                        {
                            name: 'More Tests',
                            order: [4, 5, 6, 7]
                        }
                    ]
                }
            }
        }
        const schema = makeExecutableSchema({
            typeDefs: sdl,
            resolvers
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
            deepAuthParams: {
                $user_id: 'Groot'
            }
        }).then( (response) => {
            console.log(response);
            expect(response).toEqual(
                expect.objectContaining({
                    data: expect.objectContaining({
                        tasks: expect.arrayContaining([
                            expect.objectContaining({
                                name: expect.stringMatching('Build Test'),
                                order: expect.arrayContaining([0, 1, 2, 3])
                            }),
                            expect.objectContaining({
                                name: expect.stringMatching('More Tests'),
                                order: expect.arrayContaining([4, 5, 6, 7])
                            }),
                        ])
                    })
                })
            );
        });
    })
});