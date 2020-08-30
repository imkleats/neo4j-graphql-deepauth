import {
  coerceInputValue,
  GraphQLInputType,
  GraphQLNamedType,
  GraphQLSchema,
  isInputObjectType,
  isInputType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  parseValue,
  valueFromAST,
  valueFromASTUntyped,
} from 'graphql';
import { TranslationContext } from './TranslationContext';

export function validateDeepAuthSchema(schema: GraphQLSchema) {
  const typeMap = schema.getTypeMap();
  for (const namedType of Object.keys(typeMap)) {
    // Apply neo4jgraphql naming convention to find filter Input Object type name
    const filterInputTypeName = `_${namedType}Filter`;
    typeMap[namedType].astNode?.directives
      ?.filter(directive => directive.name.value === 'deepAuth')
      .map(directive =>
        directive.arguments
          ?.filter(arg => arg.name.value === 'path')
          ?.map(pathNode => {
            const path = pathNode.value?.kind === 'StringValue' ? `{ ${pathNode.value.value} }` : '';
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

    for (const field of Object.keys(fieldDefs).map(key => fieldDefs[key])) {
      const fieldValue = inputValue[field.name];

      if (fieldValue === undefined) {
        if (field.defaultValue !== undefined) {
          coercedValue[field.name] = field.defaultValue;
        } else if (isNonNullType(field.type)) {
          throw Error('non null type requires a value or a default');
        }
        continue;
      }

      coercedValue[field.name] = coerceDeepAuthInputValueImpl(fieldValue, field.type, context);
    }

    // Ensure every provided field is defined.
    for (const fieldName of Object.keys(inputValue)) {
      if (!fieldDefs[fieldName]) {
        throw Error('field not defined on input object');
      }
    }

    if (isFilterInput(type.name)) {
      const filteredType = context.getSchema().getType(getTypeNameFromFilterName(type.name));
      const deepAuthFilter = filteredType ? getDeepAuthFromType(filteredType, context) : null;
      if (deepAuthFilter) {
        coercedValue = { AND: [valueFromAST(deepAuthFilter, type), coercedValue] };
      }
    }
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

export function getDeepAuthFromType(type: GraphQLNamedType, context: TranslationContext) {
  // Currently does not support Interface or Union types.
  // Check for ObjectTypes that can have @deepAuth directive.
  if (isObjectType(type)) {
    const authConfig = type?.astNode?.directives
      ?.filter(directive => directive.name.value === 'deepAuth')?.[0]
      ?.arguments?.reduce((acc: any, arg) => {
        switch (arg.name.value) {
          case 'path':
            if (arg.value.kind === 'StringValue') {
              acc.path = arg.value.value;
            }
            break;
          case 'variables':
            const authVariables: string[] = [];
            if (arg.value.kind === 'ListValue') {
              arg.value.values.map(varArg => {
                if (varArg.kind === 'StringValue') {
                  authVariables.push(varArg.value);
                }
              });
              acc.variables = authVariables;
            }
            break;
        }
        return acc;
      }, {});

    return authConfig
      ? parseValue(
          populateArgsInPath(authConfig.path, authConfig.variables, context.fromRequestContext('deepAuthParams')),
        )
      : undefined;
  } else {
    return undefined;
  }
}

function populateArgsInPath(myPath: string, args: string[], ctxParams: any): string {
  const populatedPath = args?.reduce((acc: string, param: string) => {
    return acc.replace(param, ctxParams[param]);
  }, myPath);
  return populatedPath;
}
