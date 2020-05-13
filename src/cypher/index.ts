export function Match(...patterns: string[]) {
  return `MATCH ${patterns.join(',\n')}`;
}

export function Optional(match: string) {
  return `OPTIONAL ${match}`;
}

export function With(...items: string[]) {
  return `WITH ${items.join(',')}`;
}

export function Where(...clauses: string[]) {
  return `${clauses.length > 0 ? 'WHERE ' : ''}${clauses.join(' AND ')}`;
}

export function And(...clauses: string[]) {
  return clauses.map(clause => ['(', ')'].join(clause)).join(' AND ');
}

export function Or(...clauses: string[]) {
  return clauses.map(clause => ['(', ')'].join(clause)).join(' OR ');
}

export function CypherNode(name: string = '', labels: string = '', attributes: string = '') {
  return `(${name + labels}${attributes === '' ? attributes : ' ' + attributes.trim()})`;
}

export function Labels(...labels: string[]) {
  return `${labels.length > 0 ? ':' : ''}${labels.join(':')}`;
}

export function RelationBlock(
  name: string = '',
  labels: string = '',
  attributes: string = '',
  pathLength: string = '',
) {
  return `[${name}${labels}${pathLength === '' ? pathLength : ' ' + pathLength}${
    attributes === '' ? attributes : ' ' + attributes
  }]`;
}

export function Relationship(relblock: string = '', inbound: boolean = false, outbound: boolean = false) {
  return `${inbound ? '<-' : '-'}${relblock}${outbound ? '->' : '-'}`;
}

export function Pattern(...items: string[]) {
  return items.join('');
}

export function MapList(...items: string[]) {
  return `{${items.join(', ')}}`;
}

export function Property(name: string, value: string) {
  return `${name}: ${value}`;
}

export function Attribute(name: string) {
  return `.${name}`;
}

export function Parameter(name: string) {
  return `$${name}`;
}

export function ListComprehension(statement: string, returning: string = '') {
  return `[${statement}${returning !== '' ? ' | ' + returning : ''}]`;
}

export function Alias(item: string, alias: string) {
  return `${item} AS ${alias}`;
}

export function Head(list: string) {
  return `head(${list})`;
}

export function ReturnItem(name: string, valueMapList: string = '') {
  return `${[name, valueMapList].join(' ').trim()}`;
}

export function Return(...items: string[]) {
  return `RETURN ${items.join(',')}`;
}

export function Query(...statements: string[]) {
  return statements.filter(statement => !(statement === '' || statement === ' ')).join('\n');
}
