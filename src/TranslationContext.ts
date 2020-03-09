import {
  GraphQLSchema,
  TypeInfo,
  GraphQLOutputType,
  GraphQLCompositeType,
  GraphQLInputType,
  GraphQLField,
  GraphQLDirective,
  GraphQLArgument,
  ASTNode,
} from 'graphql';
import Maybe from 'graphql/tsutils/Maybe';
import { AstCoalescer, ResolveInfo } from '.';

// Modeling after graphql-js ValidationContext
// Still a WIP to determine what might be helpful to
// access routinely in TranslationRules.

export class TranslationContext {
  //protected _ast: ASTNode;
  protected _storeAstNode: (astMapNode: { loc: string; node: AstCoalescer }) => void;
  protected _getAstNode: (astMapLoc: string) => AstCoalescer;
  protected _schema: GraphQLSchema;
  protected _typeInfo: TypeInfo;
  protected _reqCtx: any;
  protected _params: { [argName: string]: any };
  protected _state: Object;
  protected _authActions: Array<{ action: string; payload: any }>;

  constructor(
    params: { [argName: string]: any }, // is this needed? or is it already in resolveInfo?
    reqCtx: any,
    resolveInfo: ResolveInfo,
    typeInfo: TypeInfo,
    storeAstNode: (astMapNode: { loc: string; node: AstCoalescer }) => void,
    getAstNode: (astMapLoc: string) => AstCoalescer,
  ) {
    //this._ast = resolveInfo.operation;
    this._reqCtx = reqCtx;
    this._schema = resolveInfo.schema;
    this._typeInfo = typeInfo;
    this._storeAstNode = storeAstNode;
    this._getAstNode = getAstNode;
    this._params = params;
    this._state = Object.create(null);
    this._authActions = [];
  }

  // accessor and utility methods?
  addAuthAction(authAction: { action: string; payload: any }): void {
    this._authActions.push(authAction);
  }

  getAuthActions(): Array<{ action: string; payload: any }> {
    return this._authActions;
  }

  setState(newState: Object): void {
    this._state = Object.assign(this._state, newState);
  }

  currentState(): Readonly<Object> {
    return this._state;
  }

  postToAstMap(astMapNode: { loc: string; node: AstCoalescer }): void {
    this._storeAstNode(astMapNode);
  }

  getFromAstMap(astMapLoc: string): AstCoalescer {
    return this._getAstNode(astMapLoc);
  }

  getSchema(): GraphQLSchema {
    return this._schema;
  }

  getType(): Maybe<GraphQLOutputType> {
    return this._typeInfo.getType();
  }

  getParentType(): Maybe<GraphQLCompositeType> {
    return this._typeInfo.getParentType();
  }

  getInputType(): Maybe<GraphQLInputType> {
    return this._typeInfo.getInputType();
  }

  getParentInputType(): Maybe<GraphQLInputType> {
    return this._typeInfo.getParentInputType();
  }

  getFieldDef(): Maybe<GraphQLField<any, any>> {
    return this._typeInfo.getFieldDef();
  }

  getDirective(): Maybe<GraphQLDirective> {
    return this._typeInfo.getDirective();
  }

  getArgument(): Maybe<GraphQLArgument> {
    return this._typeInfo.getArgument();
  }

  fromRequestContext(arg: string) {
    return this._reqCtx[arg];
  }
}
