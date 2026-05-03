export const createPrismaMock = () => ({
  $transaction: jest.fn(),
  githubConnection: {
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  gitHubRepo: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  action: {
    findMany: jest.fn(),
  },
  workflowRun: {
    create: jest.fn(),
    update: jest.fn(),
  },
});

export const createPayload = (overrides: any = {}) => ({
  action: "created",
  installation: {
    id: 101,
    account: {
      id: 77,
      login: "octo",
      url: "https://api.github.com/users/octo",
      html_url: "https://github.com/octo",
      avatar_url: "https://img",
      type: "User",
      repos_url: "https://api.github.com/users/octo/repos",
    },
  },
  repository: {
    id: 202,
    name: "repo",
    full_name: "octo/repo",
    private: false,
  },
  sender: {
    url: "https://api.github.com/users/octo",
    html_url: "https://github.com/octo",
    organizations_url: "https://api.github.com/users/octo/orgs",
  },
  repositories: [
    {
      id: 202,
      name: "repo",
      full_name: "octo/repo",
      private: false,
    },
  ],
  pusher: {
    email: "pusher@example.com",
  },
  ...overrides,
});
