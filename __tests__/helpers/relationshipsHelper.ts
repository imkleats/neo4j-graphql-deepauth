export const BasicTypeDefs = `
type Task {
    name: String
    order: [Int]
    assignment: [Assignment]  @deepAuth(path: "$filter_task" variables: ["$filter_task"])
}
type User {
    name: String
    assigned: [Assignment] @deepAuth(path: "$filter_user" variables: ["$filter_user"])
}
type Assignment @relation(name: "ASSIGNED") {
    from: User
    to: Task
    due: String
}
directive @deepAuth(
    path: String
    variables: [String]
) on OBJECT | FIELD_DEFINITION
`;

export const BasicQuery = `
query {
    Task {
        name
        order
        assignment {
            due
        }
    }
}
`;

export const BasicWithExistingQuery = `
query {
    Task {
        name
        order
        assignment(filter: { due_contains: "Tom"}) {
            due
        }
    }
}
`;

export const BasicResponse = {
  data: {
    Task: [
      {
        name: 'Build Tests',
        order: [0, 1, 2, 3],
        assignment: [
          {
            due: 'Tomorrow',
          },
        ],
      },
      {
        name: 'More Tests',
        order: [4, 5, 6, 7],
        assignment: [
          {
            due: 'Day After Next',
          },
        ],
      },
    ],
  },
};

export const NestedQuery = `
query {
    Task {
        name
        order
        assignment {
            due
            User {
                assigned {
                    Task {
                        name
                    }
                }
            }
        }
    }
}
`;

export const NestedResponse = {
  data: {
    Task: [
      {
        name: 'Build Tests',
        order: [0, 1, 2, 3],
        assignment: [
          {
            due: 'Tomorrow',
            User: {
              assigned: [
                {
                  Task: {
                    name: 'Build Tests',
                  },
                },
              ],
            },
          },
        ],
      },
      {
        name: 'More Tests',
        order: [4, 5, 6, 7],
        assignment: [
          {
            due: 'Day After Next',
            User: {
              assigned: [
                {
                  Task: {
                    name: 'More Tests',
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  },
};

export const BasicContext = {
  deepAuthParams: {
    $filter_task: '{ User: {name: "Groot"} }',
    $filter_user: '{ Task: {name: "Groot Work"} }',
  },
};
