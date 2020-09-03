export const BasicQuery = `
query {
    Task {
        name
        order
    }
}
`;

export const BasicResponse = {
  data: {
    Task: [
      {
        name: 'Build Tests',
        order: [0, 1, 2, 3],
      },
      {
        name: 'More Tests',
        order: [4, 5, 6, 7],
      },
    ],
  },
};

const BasicAuthFilterNode = expect.objectContaining({
  kind: 'ObjectValue',
  fields: expect.arrayContaining([
    expect.objectContaining({
      kind: 'ObjectField',
      name: expect.objectContaining({
        kind: 'Name',
        value: 'visibleTo_some',
      }),
      value: expect.objectContaining({
        kind: 'ObjectValue',
        fields: expect.arrayContaining([
          expect.objectContaining({
            kind: 'ObjectField',
            name: expect.objectContaining({
              kind: 'Name',
              value: 'name_contains',
            }),
            value: expect.objectContaining({
              kind: 'StringValue',
              value: 'Groot',
            }),
          }),
        ]),
      }),
    }),
  ]),
});

export const BasicFilterArgumentNode = expect.objectContaining({
  kind: 'Argument',
  name: expect.objectContaining({
    kind: 'Name',
    value: 'filter',
  }),
  value: BasicAuthFilterNode,
});

const BasicExistingFilterNode = expect.objectContaining({
  kind: 'ObjectValue',
  fields: expect.arrayContaining([
    expect.objectContaining({
      kind: 'ObjectField',
      name: expect.objectContaining({
        kind: 'Name',
        value: 'name',
      }),
      value: expect.objectContaining({
        kind: 'StringValue',
        value: 'Groot',
      }),
    }),
  ]),
});

export const QueryWithFilter = `
query {
    Task(filter: { name: "Groot" }) {
        name
        order
    }
}
`;

export const QueryWithFilterArgumentNode = expect.objectContaining({
  kind: 'Argument',
  name: expect.objectContaining({
    kind: 'Name',
    value: 'filter',
  }),
  value: expect.objectContaining({
    kind: 'ObjectValue',
    fields: expect.arrayContaining([
      expect.objectContaining({
        kind: 'ObjectField',
        name: expect.objectContaining({
          kind: 'Name',
          value: 'AND',
        }),
        value: expect.objectContaining({
          kind: 'ListValue',
          values: expect.arrayContaining([BasicExistingFilterNode, BasicAuthFilterNode]),
        }),
      }),
    ]),
  }),
});

export const QueryWithNestedObject = `
query {
    User {
        name
        tasks {
            name
            order
        }
    }
}
`;

export const NestedObjectResponse = {
  data: {
    User: [
      {
        name: 'Freddy Mercury',
        tasks: [
          {
            name: 'Build Tests',
            order: [0, 1, 2, 3],
          },
          {
            name: 'More Tests',
            order: [4, 5, 6, 7],
          },
        ],
      },
    ],
  },
};

export const QueryWithFilteredNestedObject = `
  query {
      User {
          name
          tasks (filter: { name: "Groot" }) {
              name
              order
          }
      }
  }
  `;

export const QueryWithNestedFilterObject = `
  query {
      User (filter: { tasks_some: { visibleTo: { name: "Groot" }}}) {
          name
          tasks {
              name
              order
          }
      }
  }
  `;

const NestedFilterObjectArgumentNode = expect.objectContaining({
  kind: 'ObjectValue',
  fields: expect.arrayContaining([
    expect.objectContaining({
      kind: 'ObjectField',
      name: expect.objectContaining({
        kind: 'Name',
        value: 'visibleTo',
      }),
      value: expect.objectContaining({
        kind: 'ObjectValue',
        fields: expect.arrayContaining([
          expect.objectContaining({
            kind: 'ObjectField',
            name: expect.objectContaining({
              kind: 'Name',
              value: 'name',
            }),
            value: expect.objectContaining({
              kind: 'StringValue',
              value: 'Groot',
            }),
          }),
        ]),
      }),
    }),
  ]),
});
export const QueryWithNestedFilterArgumentNode = expect.objectContaining({
  kind: 'Argument',
  name: expect.objectContaining({
    kind: 'Name',
    value: 'filter',
  }),
  value: expect.objectContaining({
    kind: 'ObjectValue',
    fields: expect.arrayContaining([
      expect.objectContaining({
        kind: 'ObjectField',
        name: expect.objectContaining({
          kind: 'Name',
          value: 'tasks_some',
        }),
        value: expect.objectContaining({
          kind: 'ObjectValue',
          fields: expect.arrayContaining([
            expect.objectContaining({
              kind: 'ObjectField',
              name: expect.objectContaining({
                kind: 'Name',
                value: 'AND',
              }),
              value: expect.objectContaining({
                kind: 'ListValue',
                values: expect.arrayContaining([NestedFilterObjectArgumentNode, BasicAuthFilterNode]),
              }),
            }),
          ]),
        }),
      }),
    ]),
  }),
});

export const BasicTypeDefs = `
    type Task @deepAuth(
        path: """{ visibleTo_some: { name_contains: "$user_id" } }""",
        variables: ["$user_id"]
    ) {
        name: String
        order: [Int]
        visibleTo: [User] @relation(name: "CAN_SEE" direction: "IN")
    }
    type User {
        name: String
        tasks: [Task] @relation(name: "CAN_SEE" direction: "OUT")
    }
    directive @deepAuth(
        path: String
        variables: [String]
    ) on OBJECT
`;

export const ExtensionTypeDefs = `
    type Task {
        name: String
        order: [Int]
        visibleTo: [User] @relation(name: "CAN_SEE" direction: "IN")
    }

    type User {
        name: String
        tasks: [Task] @relation(name: "CAN_SEE" direction: "OUT")
    }

    directive @deepAuth(
        path: String
        variables: [String]
    ) on OBJECT

    extend type Task @deepAuth(
        path: """{ visibleTo_some: { name_contains: "$user_id" } }""",
        variables: ["$user_id"]
    ) 
`;

export const InterfaceTypeDefs = `
    type Task implements Protected {
        name: String
        order: [Int]
        visibleTo: [User] @relation(name: "CAN_SEE" direction: "IN")
    }
    
    type User {
        name: String
        tasks: [Task] @relation(name: "CAN_SEE" direction: "OUT")
    }

    interface Protected @deepAuth(
        path: """{ visibleTo_some: { name_contains: "$user_id" } }""",
        variables: ["$user_id"]
    ) {
        visibleTo: [User]
    }

    directive @deepAuth(
        path: String
        variables: [String]
    ) on OBJECT | INTERFACE
`;

export const InterfaceExtensionTypeDefs = `
    type Task implements Protected {
        name: String
        order: [Int]
        visibleTo: [User] @relation(name: "CAN_SEE" direction: "IN")
    }
    
    type User {
        name: String
        tasks: [Task] @relation(name: "CAN_SEE" direction: "OUT")
    }

    interface Protected {
        visibleTo: [User]
    }

    directive @deepAuth(
        path: String
        variables: [String]
    ) on OBJECT | INTERFACE

    extend interface Protected @deepAuth(
        path: """{ visibleTo_some: { name_contains: "$user_id" } }""",
        variables: ["$user_id"]
    )
`;

export const BasicContext = {
  deepAuthParams: {
    $user_id: 'Groot',
  },
};
