import {
  ArgumentNode,
  coerceInputValue,
  DirectiveNode,
  FieldNode,
  GraphQLInputType,
  GraphQLInterfaceType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLSchema,
  InterfaceTypeExtensionNode,
  isInputObjectType,
  isInputType,
  isInterfaceType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  parseValue,
  valueFromAST,
  valueFromASTUntyped,
  ValueNode,
} from 'graphql';
import { escapeRegExp, isEqual } from 'lodash';
import { Maybe } from 'graphql/jsutils/Maybe';
import { TranslationContext } from './TranslationContext';

export function validateDeepAuthSchema(schema: GraphQLSchema) {
  const typeMap = schema.getTypeMap();
  for (const namedType of Object.keys(typeMap)) {
    // Apply neo4jgraphql naming convention to find filter Input Object type name
    const filterInputTypeName = `_${namedType}Filter`;
    typeMap[namedType].astNode?.directives
      ?.filter((directive) => directive.name.value === 'deepAuth')
      .map((directive) =>
        directive.arguments
          ?.filter((arg) => arg.name.value === 'path')
          ?.map((pathNode) => {
            const path = pathNode.value?.kind === 'StringValue' ? pathNode.value.value : '';
            const filterInputType = schema.getType(filterInputTypeName);
            if (isInputType(filterInputType)) {
              coerceInputValue(valueFromASTUntyped(parseValue(path)), filterInputType);
            }
          }),
      );
  }
}

export function coerceDeepAuthInputValue(inputValue: any, type: GraphQLInputType, context: TranslationContext): any {
  return coerceDeepAuthInputValueImpl(inputValue, type, context);
}

function coerceDeepAuthInputValueImpl(inputValue: any, type: GraphQLInputType, context: TranslationContext): any {
  if (isNonNullType(type)) {
    if (inputValue != null) {
      return coerceDeepAuthInputValueImpl(inputValue, type.ofType, context);
    }
    throw Error('expected non-nullable type to not be null');
    return;
  }

  if (inputValue == null) {
    // Explicitly return the value null.
    return null;
  }

  if (isListType(type)) {
    const itemType = type.ofType;
    if (isCollection(inputValue)) {
      return Array.from(inputValue, (itemValue, index) => {
        return coerceDeepAuthInputValueImpl(itemValue, itemType, context);
      });
    }
    // Lists accept a non-list value as a list of one.
    return [coerceDeepAuthInputValueImpl(inputValue, itemType, context)];
  }

  if (isInputObjectType(type)) {
    if (!isObjectLike(inputValue)) {
      throw Error('should be an object');
    }

    interface Coerced {
      [key: string]: any;
    }
    let coercedValue: Coerced = {};
    const fieldDefs = type.getFields();
    const parentType = type.name;

    let deepAuthFilterValue: any;
    if (isFilterInput(type.name)) {
      const [filteredType, filteredAuthConfig] = context.getTypeFromFilterName(type.name); // context.getSchema().getType(getTypeNameFromFilterName(type.name));
      // console.log(`Type Name: ${type.name}`);
      // console.log(`Filtered Type: ${JSON.stringify(filteredType, null, 2)}`);
      // console.log(`Filtered Auth Config: ${JSON.stringify(filteredAuthConfig, null, 2)}`);
      const deepAuthFilter = filteredAuthConfig
        ? parseDeepAuth(
            filteredAuthConfig.path,
            filteredAuthConfig.variables,
            context.fromRequestContext('deepAuthParams'),
          )
        : filteredType && isObjectType(filteredType)
        ? getDeepAuthFromType(filteredType, context)
        : isInterfaceType(filteredType)
        ? getDeepAuthFromInterfaceType(filteredType, context)
        : undefined;
      if (deepAuthFilter) {
        deepAuthFilterValue = valueFromAST(deepAuthFilter, type);
        // Don't need to coerce any more if inputValue is an authFilter
        if (isEqual(inputValue, deepAuthFilterValue)) return inputValue;
      }
    }
    if (isEqual(inputValue, deepAuthFilterValue)) return inputValue;
    let inputAndClause = false;
    let inputAndClauseHasAuth = false;

    for (const field of Object.keys(fieldDefs).map((key) => fieldDefs[key])) {
      const fieldValue = inputValue[field.name];

      if (fieldValue === undefined) {
        if (field.defaultValue !== undefined) {
          coercedValue[field.name] = field.defaultValue;
        } else if (isNonNullType(field.type)) {
          throw Error('non null type requires a value or a default');
        }
        continue;
      }

      if (field.name === 'AND' && isCollection(inputValue[field.name])) {
        inputAndClause = true;
        coercedValue[field.name] = inputValue[field.name].map((pred: any) => {
          if (isEqual(pred, deepAuthFilterValue)) {
            inputAndClauseHasAuth = true;
            return pred;
          } else {
            // By definition, AND fields are of same type as parent
            return coerceDeepAuthInputValueImpl(pred, field.type, context);
          }
        });
        continue;
      }

      coercedValue[field.name] = isEqual(fieldValue, deepAuthFilterValue)
        ? deepAuthFilterValue
        : coerceDeepAuthInputValueImpl(fieldValue, field.type, context);
    }

    // Ensure every provided field is defined.
    for (const fieldName of Object.keys(inputValue)) {
      if (!fieldDefs[fieldName]) {
        throw Error('field not defined on input object');
      }
    }

    coercedValue = deepAuthFilterValue
      ? inputAndClauseHasAuth
        ? coercedValue
        : inputAndClause
        ? { ...coercedValue, AND: [deepAuthFilterValue, coercedValue.AND] }
        : { AND: [deepAuthFilterValue, coercedValue] }
      : coercedValue;

    return coercedValue;
  }

  if (isLeafType(type)) {
    let parseResult;

    // Scalars and Enums determine if a input value is valid via parseValue(),
    // which can throw to indicate failure. If it throws, maintain a reference
    // to the original error.
    parseResult = type.parseValue(inputValue);
    return parseResult;
  }
}

function isCollection(obj: any): boolean {
  if (obj == null || typeof obj !== 'object') {
    return false;
  }

  // Is Array like?
  const length = obj.length;
  if (typeof length === 'number' && length >= 0 && length % 1 === 0) {
    return true;
  }

  // Is Iterable?
  return typeof obj[typeof Symbol === 'function' ? Symbol.iterator : '@@iterator'] === 'function';
}

function isObjectLike(value: any): boolean {
  return typeof value === 'object' && value !== null;
}
function isFilterInput(typeName: string): boolean {
  return typeName.startsWith('_') && typeName.endsWith('Filter');
}
function getTypeNameFromFilterName(filterName: string): string {
  return filterName.slice(1, filterName.length - 6);
}

export interface DeepAuthConfig {
  path: string;
  variables: string[];
  filterInput?: string;
}
export function getDeepAuthFromType(type: GraphQLObjectType, context: TranslationContext) {
  // Currently does not support Union types.
  // Check for presence of @deepAuth directive with following precedence:
  // 1) typeDef extension; 2) original typeDef; 3) Interface
  const authConfig =
    getDeepAuthFromTypeExtensionAst(type.extensionASTNodes) ??
    getDeepAuthFromTypeAst(type.astNode) ??
    getDeepAuthFromInterfaces(type.getInterfaces());
  return authConfig
    ? parseDeepAuth(authConfig.path, authConfig.variables, context.fromRequestContext('deepAuthParams'))
    : undefined;
}

export function getDeepAuthFromInterfaceType(type: GraphQLInterfaceType, context: TranslationContext) {
  // Currently does not support Union types.
  // Check for presence of @deepAuth directive with following precedence:
  // 1) typeDef extension; 2) original typeDef; 3) Interface
  const authConfig = getDeepAuthFromInterfaces([type]);
  return authConfig
    ? parseDeepAuth(authConfig.path, authConfig.variables, context.fromRequestContext('deepAuthParams'))
    : undefined;
}

export function getDeepAuthFromConfig(
  fieldDef: DeepAuthConfig,
  context: TranslationContext,
): [Maybe<ValueNode>, Maybe<GraphQLNamedType>] {
  return [
    parseDeepAuth(fieldDef.path, fieldDef.variables, context.fromRequestContext('deepAuthParams')),
    context.getSchema().getType(`${fieldDef?.filterInput}`),
  ];
}

export function deepAuthArgumentReducer(acc: DeepAuthConfig, arg: ArgumentNode) {
  switch (arg.name.value) {
    case 'path':
      if (arg.value.kind === 'StringValue') {
        acc.path = arg.value.value;
      }
      break;
    case 'variables':
      const authVariables: string[] = [];
      if (arg.value.kind === 'ListValue') {
        arg.value.values.map((varArg) => {
          if (varArg.kind === 'StringValue') {
            authVariables.push(varArg.value);
          }
        });
        acc.variables = authVariables;
      }
      break;
    case 'filterInput':
      if (arg.value.kind === 'StringValue') {
        acc.filterInput = arg.value.value;
      }
      break;
  }
  return acc;
}

function parseDeepAuth(path: string, variables: string[], params: any) {
  return parseValue(populateArgsInPath(path, variables, params));
}

type findDirectiveFn = (x: string) => (y: DirectiveNode) => boolean;
const findDirective: findDirectiveFn = (name: string) => (directive: DirectiveNode) => directive.name.value === name;
const findExtensionWithDirective = (name: string, filterFn: findDirectiveFn) => (
  extension: ObjectTypeExtensionNode | InterfaceTypeExtensionNode,
) => extension?.directives?.find(filterFn(name));

export function getDeepAuthFromTypeAst(typeDef: Maybe<ObjectTypeDefinitionNode> | Maybe<InterfaceTypeExtensionNode>) {
  return typeDef?.directives
    ?.find(findDirective('deepAuth'))
    ?.arguments?.reduce(deepAuthArgumentReducer, { path: '', variables: [] });
}

export function getDeepAuthFromInterfaces(interfaces: GraphQLInterfaceType[]) {
  return (
    interfaces
      ?.find((inter) => inter?.astNode?.directives?.find(findDirective('deepAuth')))
      ?.astNode?.directives?.find(findDirective('deepAuth'))
      ?.arguments?.reduce(deepAuthArgumentReducer, { path: '', variables: [] }) ??
    interfaces
      ?.find((inter) => inter?.extensionASTNodes?.find(findExtensionWithDirective('deepAuth', findDirective)))
      ?.extensionASTNodes?.find(findExtensionWithDirective('deepAuth', findDirective))
      ?.directives?.find(findDirective('deepAuth'))
      ?.arguments?.reduce(deepAuthArgumentReducer, { path: '', variables: [] })
  );
}

export function getDeepAuthFromTypeExtensionAst(extensions: Maybe<readonly ObjectTypeExtensionNode[]>) {
  return extensions
    ?.find(findExtensionWithDirective('deepAuth', findDirective))
    ?.directives?.find(findDirective('deepAuth'))
    ?.arguments?.reduce(deepAuthArgumentReducer, { path: '', variables: [] });
}

function populateArgsInPath(myPath: string, args: string[], ctxParams: any): string {
  const populatedPath = args?.reduce((acc: string, param: string) => {
    return acc.replace(new RegExp(escapeRegExp(param), 'g'), ctxParams[param]);
  }, myPath);
  return populatedPath;
}
export function getExistingFilter(fieldNode: FieldNode) {
  return fieldNode.arguments?.reduce<[ArgumentNode | undefined, number]>(
    (accTuple: [ArgumentNode | undefined, number], argNode: ArgumentNode, argIdx: number) => {
      if (accTuple?.[0] === undefined) {
        // Until a filterArgument is found...
        if (argNode.name.value === 'filter') {
          //  Check if argument.value.name is filter
          return [argNode as ArgumentNode, argIdx]; //  return the argumentNode if it is, and the actual index.
        } else {
          //  Else (argument is not filter && filter has not yet been found)
          return [undefined, argIdx + 1]; //  Keep undefined node, and set Index at idx+1 in case filter never found.
        }
      }
      return [undefined, accTuple?.[1]]; // If filter has already been found, return the accumulator.
    },
    [undefined, 0],
  );
}
