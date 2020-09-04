import { buildSchema, isObjectType, parse } from 'graphql';
import InitializeResolver from '../src/rules/schema/InitializeResolver';

describe('Initializing ResolverMaps', () => {
  const sdl = `
        type Task {
            name: String
            visibleTo: User @relation(name: "VISIBLE_TO", direction: "OUT")
        }
        type User {
            name: String
        }
        type Query {
            Task: [Task]
        }
        directive @relation(
            name: String
            direction: [String]
        ) on OBJECT | FIELD_DEFINITION
    `;
  const schema = buildSchema(sdl);

  test('should return', () => {
    const { types } = schema.toConfig();
    const resolverMap: { [key: string]: any } = {};
    // tslint:disable-next-line: forin
    types.forEach(schemaType => {
      const typeName = schemaType.name;
      if (isObjectType(schemaType)) {
        const typeResolver: { [key: string]: any } = {};
        schemaType?.astNode?.fields?.forEach(field => {
          const resolveFn = InitializeResolver(schemaType, field.name.value, schema);
          typeResolver[field.name.value] = resolveFn;
        });
        resolverMap[typeName] = typeResolver;
      }
    });
    expect(resolverMap).toEqual(
      expect.objectContaining({
        Task: expect.objectContaining({
          name: expect.anything(),
          visibleTo: expect.anything(),
        }),
      }),
    );
    // tslint:disable-next-line: no-console
    console.log(resolverMap);
    // tslint:disable-next-line: no-console
    console.log(resolverMap?.Task?.visibleTo('task', '{ name: "Rueben" }', '{ .name }', ''));
    // tslint:disable-next-line: no-console
    console.log(
      resolverMap?.Query?.Task(
        'Query',
        '{ id: "EOEKNSK-SKMND" }',
        `{ ${resolverMap?.Task?.visibleTo('task', '{ name: "Rueben" }', '{ .name }', '') ?? ''} }`,
        '',
      ),
    );
  });
});
