const mockGet = jest.fn();

jest.mock("@nestjs/config", () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    get: mockGet,
  })),
}));

describe("collect_viewer_email", () => {
  let collect_viewer_email: typeof import("./collect_viewer_email").collect_viewer_email;
  let fetchMock: jest.Mock;

  const loadModule = () => {
    ({ collect_viewer_email } = require("./collect_viewer_email"));
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockGet.mockReset();
    mockGet.mockReturnValue("session-token");
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    loadModule();
  });

  it("extracts the email from a mailto href when present", async () => {
    fetchMock.mockResolvedValue({
      text: jest.fn().mockResolvedValue(
        '<li itemprop="email"><a href="mailto:octo@example.com">ignored@example.com</a></li>'
      ),
    });

    await expect(collect_viewer_email("https://github.com/octo")).resolves.toEqual({
      success: true,
      data: "octo@example.com",
    });
    expect(fetchMock).toHaveBeenCalledWith("https://github.com/octo", {
      headers: {
        Cookie: "user_session=session-token",
      },
    });
  });

  it("falls back to the anchor text when there is no mailto href", async () => {
    fetchMock.mockResolvedValue({
      text: jest.fn().mockResolvedValue(
        '<li itemprop="email"><a href="/users/octo"> octo@example.com </a></li>'
      ),
    });

    await expect(
      collect_viewer_email("https://github.com/octo")
    ).resolves.toEqual({
      success: true,
      data: "octo@example.com",
    });
  });

  it("returns a failure payload when the email element does not exist", async () => {
    fetchMock.mockResolvedValue({
      text: jest.fn().mockResolvedValue("<div>No email here</div>"),
    });

    await expect(
      collect_viewer_email("https://github.com/octo")
    ).resolves.toEqual({
      success: false,
      message: "email doesn't exist",
    });
  });

  it("includes an empty session token when USER_SESSION is missing", async () => {
    mockGet.mockReturnValue(undefined);
    loadModule();
    fetchMock.mockResolvedValue({
      text: jest.fn().mockResolvedValue(
        '<li itemprop="email"><a href="mailto:octo@example.com">octo@example.com</a></li>'
      ),
    });

    await collect_viewer_email("https://github.com/octo");

    expect(fetchMock).toHaveBeenCalledWith("https://github.com/octo", {
      headers: {
        Cookie: "user_session=undefined",
      },
    });
  });

  it("returns a failure payload when fetch throws", async () => {
    const error = new Error("network down");
    fetchMock.mockRejectedValue(error);

    await expect(
      collect_viewer_email("https://github.com/octo")
    ).resolves.toEqual({
      success: false,
      message: "Failed to collect viewer email",
      error,
    });
  });
});
