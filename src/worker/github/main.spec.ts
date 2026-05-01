const installationHandler = jest.fn();
const repositoryHandler = jest.fn();
const starHandler = jest.fn();
const issuesHandler = jest.fn();
const forkHandler = jest.fn();
const commitCommentHandler = jest.fn();
const issueCommentHandler = jest.fn();
const watchHandler = jest.fn();
const createHandler = jest.fn();
const deleteHandler = jest.fn();
const workflowJobHandler = jest.fn();
const workflowRunHandler = jest.fn();

jest.mock("./core", () => ({
  Installation_event: jest.fn().mockImplementation(() => ({
    Installation_event: installationHandler,
  })),
  Repository_event: jest.fn().mockImplementation(() => ({
    Repository_event: repositoryHandler,
  })),
  Star_event: jest.fn().mockImplementation(() => ({
    Star_event: starHandler,
  })),
  Issues_event: jest.fn().mockImplementation(() => ({
    Issues_event: issuesHandler,
  })),
  Fork_event: jest.fn().mockImplementation(() => ({
    Fork_event: forkHandler,
  })),
  Commit_comment_event: jest.fn().mockImplementation(() => ({
    Commit_comment_event: commitCommentHandler,
  })),
  Issue_comment_event: jest.fn().mockImplementation(() => ({
    Issue_comment_event: issueCommentHandler,
  })),
  Watch_event: jest.fn().mockImplementation(() => ({
    Watch_event: watchHandler,
  })),
  Create_event: jest.fn().mockImplementation(() => ({
    Create_event: createHandler,
  })),
  Delete_event: jest.fn().mockImplementation(() => ({
    Delete_event: deleteHandler,
  })),
  Workflow_job_event: jest.fn().mockImplementation(() => ({
    Workflow_job_event: workflowJobHandler,
  })),
  Workflow_run_event: jest.fn().mockImplementation(() => ({
    Workflow_run_event: workflowRunHandler,
  })),
}));

describe("main", () => {
  let main: typeof import("./main").main;
  let consoleLogSpy: jest.SpyInstance;

  const loadModule = () => {
    ({ main } = require("./main"));
  };

  beforeEach(() => {
    jest.resetModules();
    installationHandler.mockReset();
    repositoryHandler.mockReset();
    starHandler.mockReset();
    issuesHandler.mockReset();
    forkHandler.mockReset();
    commitCommentHandler.mockReset();
    issueCommentHandler.mockReset();
    watchHandler.mockReset();
    createHandler.mockReset();
    deleteHandler.mockReset();
    workflowJobHandler.mockReset();
    workflowRunHandler.mockReset();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    loadModule();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it.each([
    ["installation", installationHandler, { success: true, message: "ok" }],
    ["repository", repositoryHandler, { success: true }],
    ["star", starHandler, { success: true }],
    ["issues", issuesHandler, { success: true }],
    ["fork", forkHandler, { success: true }],
    ["commit_comment", commitCommentHandler, { success: true }],
    ["issue_comment", issueCommentHandler, { success: true }],
    ["watch", watchHandler, { success: true }],
    ["create", createHandler, { success: true }],
    ["delete", deleteHandler, { success: true }],
    ["workflow_job", workflowJobHandler, { success: true }],
    ["workflow_run", workflowRunHandler, { success: true }],
  ])(
    "routes %s events to the matching handler",
    async (event, handler, expected) => {
      const payload = {
        event,
        data: {
          id: 1,
        },
      };
      handler.mockResolvedValue(expected);

      await expect(main(payload)).resolves.toEqual(expected);
      expect(handler).toHaveBeenCalledWith(payload);
    }
  );

  it("returns success and logs for unknown events", async () => {
    const payload = {
      event: "unknown_event",
      data: {},
    };

    await expect(main(payload)).resolves.toEqual({
      success: true,
    });
    expect(consoleLogSpy).toHaveBeenCalledWith("Unknown event");
  });

  it("returns the retryable failure payload when a handler throws", async () => {
    const payload = {
      event: "installation",
      data: {},
    };
    installationHandler.mockRejectedValue(new Error("boom"));

    await expect(main(payload)).resolves.toEqual({
      success: false,
      message: "",
      allUpTo: false,
      requeue: true,
    });
  });
});
