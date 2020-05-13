import {
  ASTVisitor,
  FieldNode,
  getNamedType,
  GraphQLField,
  isCompositeType,
  isLeafType,
  isObjectType,
  isScalarType,
  OperationDefinitionNode,
  SelectionSetNode,
} from 'graphql';
import {
  Attribute,
  CypherNode,
  ListComprehension,
  MapList,
  Match,
  Pattern,
  Property,
  Query,
  Return,
  Where,
} from '../cypher';
import { TranslationContext } from '../TranslationContext';

function buildRelationship(fieldInfo: GraphQLField<any, any, { [key: string]: any }>, safeParentName: string) {
  const relationDirective = fieldInfo.astNode?.directives?.find(directive => {
    return directive.name.value === 'relation';
  });
  return;
}

export default function BuildSubselectionsRule(context: TranslationContext): ASTVisitor {
  return {
    enter: {
      SelectionSet(
        node: SelectionSetNode,
        key: string | number | undefined,
        parent: any,
        path: ReadonlyArray<string | number>,
        ancestors: any,
      ) {
        const pathString = path.join('.');
        if (parent?.kind !== 'OperationDefinition') {
          // Post up to collect Selections
          context.postToAstMap({
            loc: pathString,
            node: astMap => {
              // Collects subselection items
              const subselections = node.selections.map((val, idx) => {
                const opPath = [pathString, 'selections', idx].join('.');
                return astMap?.[opPath]?.(astMap);
              });
              // Puts items into: {item1, item2, item3, ... itemN}
              return MapList(...subselections);
            },
          });
        }
      },
      Field(
        node: FieldNode,
        key: string | number | undefined,
        parent: any,
        path: ReadonlyArray<string | number>,
        ancestors: any,
      ) {
        const state = context.currentState();
        const pathString = path.join('.');
        const parentPath = state?.selectionParentPath;
        const fieldInfo = context.getFieldDef();
        const fieldType = context.getType();
        const parentInfo = context.getParentType();
        const name = node.name.value;
        const parentName = parentPath ? state?.[parentPath + '--name'] ?? '' : '';
        const innerType = fieldType ? getNamedType(fieldType) : undefined;

        context.setState({
          [pathString + '--name']: parentName === '' ? name : [parentName, name].join('_'),
        });

        if (!state?.isRootSelection && state?.operation === 'query') {
          // This field is a subselection
          // If Scalar, return: ".name"
          // If Object, return: "name: [pattern | subselection]"
          context.postToAstMap({
            loc: path.join('.'),
            node: astMap => {
              let selectItem;
              if (isLeafType(innerType)) {
                selectItem = Attribute(name);
              } else if (isCompositeType(innerType)) {
                const pattern = '';
                const listComp = ListComprehension(pattern, astMap?.[[pathString, 'selectionSet'].join('.')]?.(astMap));
                selectItem = Property(name, listComp);
              }
              return selectItem;
            },
          });
        }
      },
    },
    leave: {},
  };
}
