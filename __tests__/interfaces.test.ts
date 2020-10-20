import { graphql, GraphQLResolveInfo, isObjectType } from 'graphql';
import { applyDeepAuth, translate } from '../src';
// tslint:disable-next-line: no-var-requires
const { makeExecutableSchema } = require('neo4j-graphql-js');
import { runTestThroughResolver } from './helpers/runResolvers';
import {
  BasicContext,
  BasicQuery,
  BasicResponse,
  BasicTypeDefs,
  ExtensionTypeDefs,
  InterfaceTypeDefs,
  InterfaceExtensionTypeDefs,
  BasicFilterArgumentNode,
  BasicAuthFilterParam,
  QueryWithFilter,
  QueryWithFilterVariables,
  QueryWithFilterArgumentNode,
  QueryWithNestedObject,
  QueryWithFilteredNestedObject,
  QueryWithNestedFilterObject,
  NestedObjectResponse,
  QueryWithNestedFilterArgumentNode,
  QueryWithFilterParams,
  BasicExistingFilterParam,
  NestedFilterObjectArgumentParam,
  QueryWithNestedFilterArgumentParams,
  QueryWithNestedFragmentObject,
  QueryWithFilteredNestedFragmentObject,
  NestedObjectFragmentResponse,
  QueryWithAuthFilteredNestedObject,
  DuplicateFilterArgumentNode,
  DuplicateAuthFilterParam,
  DuplicateTypeDefs,
} from './helpers/interfacesHelper';

describe('Applying deepAuth through Extensions and Interfaces', () => {
  describe('deepAuth applied through Extensions', () => {
    test('adds the auth filter argument on root selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        expect(args.filter).toBeUndefined();
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        expect(authParams).toHaveProperty('filter', BasicAuthFilterParam);
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'arguments', 0],
          BasicFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(ExtensionTypeDefs, BasicQuery, BasicContext, 'Task', BasicResponse, testFn).then(
        (response) => {
          expect(response).toEqual(BasicResponse);
        },
      );
    });
    test('adds the auth filter argument to all instances of auth variable declared', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        expect(args.filter).toBeUndefined();
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        expect(authParams).toHaveProperty('filter', DuplicateAuthFilterParam);
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'arguments', 0],
          DuplicateFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(DuplicateTypeDefs, BasicQuery, BasicContext, 'Task', BasicResponse, testFn).then(
        (response) => {
          expect(response).toEqual(BasicResponse);
        },
      );
    });
    test('nests an existing filter argument on root selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        expect(args).toHaveProperty('filter', BasicExistingFilterParam);
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        expect(authParams).toHaveProperty('filter', QueryWithFilterParams);
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'arguments', 0],
          QueryWithFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(
        ExtensionTypeDefs,
        QueryWithFilter,
        BasicContext,
        'Task',
        BasicResponse,
        testFn,
      ).then((response) => {
        expect(response).toEqual(BasicResponse);
      });
    });
    test('nests an existing filter argument using variables on root selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        expect(args).toHaveProperty('filter', BasicExistingFilterParam);
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        expect(authParams).toHaveProperty('filter', QueryWithFilterParams);
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'arguments', 0],
          QueryWithFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(
        ExtensionTypeDefs,
        QueryWithFilterVariables,
        BasicContext,
        'Task',
        BasicResponse,
        testFn,
        { testName: 'Groot' },
      ).then((response) => {
        expect(response).toEqual(BasicResponse);
      });
    });
    test('adds the auth filter argument on a nested selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        expect(args.filter).toBeUndefined();
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        // isObjectType(resolveInfo.returnType) ? resolveInfo.returnType.getInterfaces()
        expect(authParams.filter).toBeUndefined();
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'selectionSet', 'selections', 1, 'arguments', 0],
          BasicFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(
        ExtensionTypeDefs,
        QueryWithNestedObject,
        BasicContext,
        'User',
        NestedObjectResponse,
        testFn,
      ).then((response) => {
        expect(response).toEqual(NestedObjectResponse);
      });
    });
    test('adds the auth filter argument on a nested selection in a fragment', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        expect(args.filter).toBeUndefined();
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        // isObjectType(resolveInfo.returnType) ? resolveInfo.returnType.getInterfaces()
        expect(authParams.filter).toBeUndefined();
        expect(testTranslate).toHaveProperty(
          ['fragments', 'taskDetails', 'selectionSet', 'selections', 0, 'arguments', 0],
          BasicFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(
        ExtensionTypeDefs,
        QueryWithNestedFragmentObject,
        BasicContext,
        'User',
        NestedObjectResponse,
        testFn,
      ).then((response) => {
        expect(response).toEqual(NestedObjectResponse);
      });
    });
    test('nests an existing filter argument on root selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        // isObjectType(resolveInfo.returnType) ? resolveInfo.returnType.getInterfaces()
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'selectionSet', 'selections', 1, 'arguments', 0],
          QueryWithFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(
        ExtensionTypeDefs,
        QueryWithFilteredNestedObject,
        BasicContext,
        'User',
        NestedObjectResponse,
        testFn,
      ).then((response) => {
        expect(response).toEqual(NestedObjectResponse);
      });
    });

    test('nests an existing filter argument on root selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        const { authParams: secondAuthParams, authResolveInfo: secondAuthResolverInfo } = applyDeepAuth(
          authParams,
          ctx,
          testTranslate,
        );
        // isObjectType(resolveInfo.returnType) ? resolveInfo.returnType.getInterfaces()
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'selectionSet', 'selections', 1, 'arguments', 0],
          BasicFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(
        ExtensionTypeDefs,
        QueryWithAuthFilteredNestedObject,
        BasicContext,
        'User',
        NestedObjectResponse,
        testFn,
      ).then((response) => {
        expect(response).toEqual(NestedObjectResponse);
      });
    });

    test('nests the auth filter onto a nested filter on non-authed root selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        expect(args).toHaveProperty('filter', NestedFilterObjectArgumentParam);
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        expect(authParams).toHaveProperty('filter', QueryWithNestedFilterArgumentParams);
        // isObjectType(resolveInfo.returnType) ? resolveInfo.returnType.getInterfaces()
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'arguments', 0],
          QueryWithNestedFilterArgumentNode,
        );
      };

      return runTestThroughResolver(
        ExtensionTypeDefs,
        QueryWithNestedFilterObject,
        BasicContext,
        'User',
        NestedObjectResponse,
        testFn,
      ).then((response) => {
        expect(response).toEqual(NestedObjectResponse);
      });
    });
    test('nests the auth filter onto a nested filter on non-authed root selection in a fragment', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        expect(args.filter).toBeUndefined();
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        // isObjectType(resolveInfo.returnType) ? resolveInfo.returnType.getInterfaces()
        expect(authParams.filter).toBeUndefined();
        expect(testTranslate).toHaveProperty(
          ['fragments', 'userDetails', 'selectionSet', 'selections', 0, 'arguments', 0],
          QueryWithNestedFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(
        ExtensionTypeDefs,
        QueryWithFilteredNestedFragmentObject,
        BasicContext,
        'User',
        NestedObjectFragmentResponse,
        testFn,
      ).then((response) => {
        expect(response).toEqual(NestedObjectFragmentResponse);
      });
    });
  });
  describe('deepAuth applied through interface application', () => {
    test('adds the auth filter argument on root selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        // isObjectType(resolveInfo.returnType) ? resolveInfo.returnType.getInterfaces()
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'arguments', 0],
          BasicFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(InterfaceTypeDefs, BasicQuery, BasicContext, 'Task', BasicResponse, testFn).then(
        (response) => {
          expect(response).toEqual(BasicResponse);
        },
      );
    });
    test('nests an existing filter argument on root selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        // isObjectType(resolveInfo.returnType) ? resolveInfo.returnType.getInterfaces()
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'arguments', 0],
          QueryWithFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(
        InterfaceTypeDefs,
        QueryWithFilter,
        BasicContext,
        'Task',
        BasicResponse,
        testFn,
      ).then((response) => {
        expect(response).toEqual(BasicResponse);
      });
    });
    test('adds the auth filter argument on a nested selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        // isObjectType(resolveInfo.returnType) ? resolveInfo.returnType.getInterfaces()
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'selectionSet', 'selections', 1, 'arguments', 0],
          BasicFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(
        InterfaceTypeDefs,
        QueryWithNestedObject,
        BasicContext,
        'User',
        NestedObjectResponse,
        testFn,
      ).then((response) => {
        expect(response).toEqual(NestedObjectResponse);
      });
    });
    test('nests an existing filter argument on root selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        // isObjectType(resolveInfo.returnType) ? resolveInfo.returnType.getInterfaces()
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'selectionSet', 'selections', 1, 'arguments', 0],
          QueryWithFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(
        InterfaceTypeDefs,
        QueryWithFilteredNestedObject,
        BasicContext,
        'User',
        NestedObjectResponse,
        testFn,
      ).then((response) => {
        expect(response).toEqual(NestedObjectResponse);
      });
    });
    test('nests the auth filter onto a nested filter on non-authed root selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        // isObjectType(resolveInfo.returnType) ? resolveInfo.returnType.getInterfaces()
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'arguments', 0],
          QueryWithNestedFilterArgumentNode,
        );
      };

      return runTestThroughResolver(
        InterfaceTypeDefs,
        QueryWithNestedFilterObject,
        BasicContext,
        'User',
        NestedObjectResponse,
        testFn,
      ).then((response) => {
        expect(response).toEqual(NestedObjectResponse);
      });
    });
  });
  describe('deepAuth applied through extension of previously applied interfaces', () => {
    test('adds the auth filter argument on root selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        // isObjectType(resolveInfo.returnType) ? resolveInfo.returnType.getInterfaces()
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'arguments', 0],
          BasicFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(
        InterfaceExtensionTypeDefs,
        BasicQuery,
        BasicContext,
        'Task',
        BasicResponse,
        testFn,
      ).then((response) => {
        expect(response).toEqual(BasicResponse);
      });
    });
    test('nests an existing filter argument on root selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        // isObjectType(resolveInfo.returnType) ? resolveInfo.returnType.getInterfaces()
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'arguments', 0],
          QueryWithFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(
        InterfaceExtensionTypeDefs,
        QueryWithFilter,
        BasicContext,
        'Task',
        BasicResponse,
        testFn,
      ).then((response) => {
        expect(response).toEqual(BasicResponse);
      });
    });
    test('adds the auth filter argument on a nested selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        // isObjectType(resolveInfo.returnType) ? resolveInfo.returnType.getInterfaces()
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'selectionSet', 'selections', 1, 'arguments', 0],
          BasicFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(
        InterfaceExtensionTypeDefs,
        QueryWithNestedObject,
        BasicContext,
        'User',
        NestedObjectResponse,
        testFn,
      ).then((response) => {
        expect(response).toEqual(NestedObjectResponse);
      });
    });
    test('nests an existing filter argument on root selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        // isObjectType(resolveInfo.returnType) ? resolveInfo.returnType.getInterfaces()
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'selectionSet', 'selections', 1, 'arguments', 0],
          QueryWithFilterArgumentNode,
        );
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
      };

      return runTestThroughResolver(
        InterfaceExtensionTypeDefs,
        QueryWithFilteredNestedObject,
        BasicContext,
        'User',
        NestedObjectResponse,
        testFn,
      ).then((response) => {
        expect(response).toEqual(NestedObjectResponse);
      });
    });
    test('nests the auth filter onto a nested filter on non-authed root selection', () => {
      const testFn = (object: any, args: { [argName: string]: any }, ctx: any, resolveInfo: GraphQLResolveInfo) => {
        const { authParams, authResolveInfo: testTranslate } = applyDeepAuth(args, ctx, resolveInfo);
        // isObjectType(resolveInfo.returnType) ? resolveInfo.returnType.getInterfaces()
        // @ts-ignore
        // tslint:disable-next-line: no-console
        // console.log(JSON.stringify(testTranslate?.operation?.selectionSet?.selections?.[0]?.arguments?.[0], null, 2));
        expect(testTranslate).toHaveProperty(
          ['operation', 'selectionSet', 'selections', 0, 'arguments', 0],
          QueryWithNestedFilterArgumentNode,
        );
      };

      return runTestThroughResolver(
        InterfaceExtensionTypeDefs,
        QueryWithNestedFilterObject,
        BasicContext,
        'User',
        NestedObjectResponse,
        testFn,
      ).then((response) => {
        expect(response).toEqual(NestedObjectResponse);
      });
    });
  });
});
