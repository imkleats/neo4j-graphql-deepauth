import { graphql, GraphQLResolveInfo, isObjectType } from 'graphql';
import { applyDeepAuth, translate } from '../src';
// tslint:disable-next-line: no-var-requires
const { makeExecutableSchema } = require('neo4j-graphql-js');
import { runTestThroughResolver } from './helpers/runResolvers';
import {
  BasicTypeDefs,
  BasicContext,
  BasicQuery,
  BasicResponse,
  BasicWithExistingQuery,
} from './helpers/relationshipsHelper';

describe.only('neo4j-graphql-js Relationship Types', () => {
  test('should pass an existing directive to the new relationship type payload', () => {
    const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
      const { authParams, authResolveInfo } = applyDeepAuth(args, ctx, resolveInfo);
      // @ts-ignore
      // tslint:disable-next-line: no-console
      console.log(JSON.stringify(authResolveInfo.operation, null, 2));
    };

    return runTestThroughResolver(
      BasicTypeDefs,
      BasicWithExistingQuery,
      BasicContext,
      'Task',
      BasicResponse,
      testFn,
    ).then(response => {
      expect(response).toEqual(BasicResponse);
    });
  });
});
