import {
  GraphQLArgument,
  GraphQLCompositeType,
  GraphQLDirective,
  GraphQLField,
  GraphQLInputType,
  GraphQLOutputType,
  GraphQLSchema,
  TypeInfo,
} from 'graphql';
import { Maybe }from 'graphql/jsutils/Maybe';
import { AstCoalescer, ResolveInfo } from '.';

// Modeling after graphql-js ValidationContext
// Still a WIP to determine what might be helpful to
// access routinely in TranslationRules.

export class TranslationContext {
  // protected _ast: ASTNode;
  protected storeAstNode: (astMapNode: { loc: string; node: AstCoalescer }) => void;
  protected getAstNode: (astMapLoc: string) => AstCoalescer;
  protected schema: GraphQLSchema;
  protected typeInfo: TypeInfo;
  protected reqCtx: any;
  protected params: { [argName: string]: any };
  protected state: any;
  protected authActions: { action: string; payload: any }[];

  constructor(
    params: { [argName: string]: any }, // is this needed? or is it already in resolveInfo?
    reqCtx: any,
    resolveInfo: ResolveInfo,
    typeInfo: TypeInfo,
    storeAstNode: (astMapNode: { loc: string; node: AstCoalescer }) => void,
    getAstNode: (astMapLoc: string) => AstCoalescer,
  ) {
    // this._ast = resolveInfo.operation;
    this.reqCtx = reqCtx;
    this.schema = resolveInfo.schema;
    this.typeInfo = typeInfo;
    this.storeAstNode = storeAstNode;
    this.getAstNode = getAstNode;
    this.params = params;
    this.state = Object.create(null);
    this.authActions = [];
  }

  // accessor and utility methods?
  public addAuthAction(authAction: { action: string; payload: any }): void {
    this.authActions.push(authAction);
  }

  public getAuthActions(): { action: string; payload: any }[] {
    return this.authActions;
  }

  public setState(newState: object): void {
    this.state = Object.assign(this.state, newState);
  }

  public currentState(): Readonly<any> {
    return this.state;
  }

  public postToAstMap(astMapNode: { loc: string; node: AstCoalescer }): void {
    this.storeAstNode(astMapNode);
  }

  public getFromAstMap(astMapLoc: string): AstCoalescer {
    return this.getAstNode(astMapLoc);
  }

  public getSchema(): GraphQLSchema {
    return this.schema;
  }

  public getType(): Maybe<GraphQLOutputType> {
    return this.typeInfo.getType();
  }

  public getParentType(): Maybe<GraphQLCompositeType> {
    return this.typeInfo.getParentType();
  }

  public getInputType(): Maybe<GraphQLInputType> {
    return this.typeInfo.getInputType();
  }

  public getParentInputType(): Maybe<GraphQLInputType> {
    return this.typeInfo.getParentInputType();
  }

  public getFieldDef(): Maybe<GraphQLField<any, any>> {
    return this.typeInfo.getFieldDef();
  }

  public getDirective(): Maybe<GraphQLDirective> {
    return this.typeInfo.getDirective();
  }

  public getArgument(): Maybe<GraphQLArgument> {
    return this.typeInfo.getArgument();
  }

  public fromRequestContext(arg: string) {
    return this.reqCtx[arg];
  }
}
