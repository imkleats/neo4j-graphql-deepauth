import {
  ASTVisitor,
  FieldDefinitionNode,
  FieldNode,
  getNamedType,
  getNullableType,
  GraphQLCompositeType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLSchema,
  isInterfaceType,
  isLeafType,
  isListType,
  isObjectType,
  ObjectTypeDefinitionNode,
  OperationDefinitionNode,
  SelectionSetNode,
} from 'graphql';
import {
  Alias,
  Attribute,
  CypherNode,
  Head,
  Labels,
  ListComprehension,
  MapList,
  Match,
  Pattern,
  Property,
  Query,
  RelationBlock,
  Relationship,
  Return,
  ReturnItem,
  Where,
} from '../../cypher';
import { TranslationContext } from '../../TranslationContext';

export default function InitializeResolver(
  parent: GraphQLInterfaceType | GraphQLObjectType,
  fieldname: string,
  schema: GraphQLSchema,
) {
  let resolveFn;
  const fieldInfo = parent.getFields()?.[fieldname];
  const isList = isListType(getNullableType(fieldInfo.type));
  const fieldType = fieldInfo.type ? getNamedType(fieldInfo.type) : undefined;

  if (parent.name === 'Query' && (isObjectType(fieldType) || isInterfaceType(fieldType))) {
    resolveFn = (parentName: string, childAttr: string, subselections: string, predicates: string) => {
      const childNode = CypherNode(fieldname.toLowerCase(), Labels(fieldType.name), childAttr);
      const returnBlock = Alias(ReturnItem(fieldname, subselections), fieldname);
      return Query(Match(childNode), predicates, Return(returnBlock));
    };
  } else if (isLeafType(fieldType)) {
    resolveFn = (parentName: string, childAttr: string, subselections: string, predicates: string) => {
      return Attribute(fieldname);
    };
  } else if (isObjectType(fieldType) || isInterfaceType(fieldType)) {
    const relDirective = fieldInfo.astNode?.directives?.find(dir => dir.name.value === 'relation');
    const relNameNode = relDirective?.arguments?.find(arg => arg.name.value === 'name');
    const relName = relNameNode?.value.kind === 'StringValue' ? relNameNode.value.value : '';
    const relDirNode = relDirective?.arguments?.find(arg => arg.name.value === 'direction');
    const relDirection = relDirNode?.value.kind === 'StringValue' ? relDirNode.value.value : '';

    resolveFn = (parentName: string, childAttr: string, subselections: string, predicates: string) => {
      const parentNode = CypherNode(parentName);
      const relation = RelationBlock('', Labels(relName));
      const relationship = Relationship(relation, relDirection === 'IN', relDirection === 'OUT');
      const childName = parentName + '_' + fieldname;
      const childNode = CypherNode(childName, Labels(fieldType.name), childAttr);
      const pattern = Pattern(parentNode, relationship, childNode);
      const listComp = ListComprehension(pattern, ReturnItem(childName, subselections));
      const returnBlock = isList ? listComp : Head(listComp);

      return Property(fieldname, returnBlock);
    };
  }
  return resolveFn;
}
