import { collect_viewer_info } from "./collect_viewer_info";
import { collect_viewer_email } from "./collect_viewer_email";

jest.mock("./collect_viewer_email", () => ({
  collect_viewer_email: jest.fn(),
}));

describe("collect_viewer_info", () => {
  let fetchMock: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("returns the base user info when no organizations url is provided", async () => {
    fetchMock.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        login: "octo",
        avatar_url: "https://img",
        html_url: "https://github.com/octo",
        type: "User",
        user_view_type: "public",
        name: "Octo",
        company: "GitHub",
        blog: "https://blog.example",
        location: "Earth",
        email: "octo@example.com",
        bio: "bio",
        public_repos: 10,
        followers: 20,
        following: 5,
        created_at: "2026-01-01T00:00:00.000Z",
      }),
    });

    await expect(
      collect_viewer_info({
        senderUrl: "https://api.github.com/users/octo",
      })
    ).resolves.toEqual({
      username: "octo",
      avatar_url: "https://img",
      url: "https://github.com/octo",
      type: "User",
      user_view_type: "public",
      name: "Octo",
      company: "GitHub",
      blog: "https://blog.example",
      location: "Earth",
      email: "octo@example.com",
      bio: "bio",
      public_repos: 10,
      followers: 20,
      following: 5,
      account_created_at: "2026-01-01T00:00:00.000Z",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(collect_viewer_email).not.toHaveBeenCalled();
  });

  it("returns enriched viewer info with organizations and resolved email", async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          login: "octo",
          avatar_url: "https://img",
          html_url: "https://github.com/octo",
          type: "User",
          user_view_type: "public",
          name: "Octo",
          company: "GitHub",
          blog: "https://blog.example",
          location: "Earth",
          email: "",
          bio: "bio",
          public_repos: 10,
          followers: 20,
          following: 5,
          created_at: "2026-01-01T00:00:00.000Z",
        }),
      })
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          {
            login: "org-1",
            avatar_url: "https://org.img",
            description: "Org 1",
          },
          {
            login: "org-2",
            avatar_url: "https://org2.img",
            description: "Org 2",
          },
        ]),
      });
    (collect_viewer_email as jest.Mock).mockResolvedValue({
      success: true,
      data: "octo@example.com",
    });

    await expect(
      collect_viewer_info({
        senderUrl: "https://api.github.com/users/octo",
        senderOrganizationsUrl: "https://api.github.com/users/octo/orgs",
      })
    ).resolves.toEqual({
      success: true,
      data: {
        username: "octo",
        avatar_url: "https://img",
        url: "https://github.com/octo",
        type: "User",
        user_view_type: "public",
        name: "Octo",
        company: "GitHub",
        blog: "https://blog.example",
        location: "Earth",
        email: "octo@example.com",
        bio: "bio",
        public_repos: 10,
        followers: 20,
        following: 5,
        account_created_at: "2026-01-01T00:00:00.000Z",
        organizations: [
          {
            organization_username: "org-1",
            organization_avatar_url: "https://org.img",
            organization_description: "Org 1",
          },
          {
            organization_username: "org-2",
            organization_avatar_url: "https://org2.img",
            organization_description: "Org 2",
          },
        ],
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(collect_viewer_email).toHaveBeenCalledWith("https://github.com/octo");
  });

  it("sets email to null when email lookup fails", async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          login: "octo",
          avatar_url: "https://img",
          html_url: "https://github.com/octo",
          type: "User",
          user_view_type: "public",
          name: "Octo",
          company: "GitHub",
          blog: "https://blog.example",
          location: "Earth",
          email: "",
          bio: "bio",
          public_repos: 10,
          followers: 20,
          following: 5,
          created_at: "2026-01-01T00:00:00.000Z",
        }),
      })
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([]),
      });
    (collect_viewer_email as jest.Mock).mockResolvedValue({
      success: false,
      message: "not found",
    });

    await expect(
      collect_viewer_info({
        senderUrl: "https://api.github.com/users/octo",
        senderOrganizationsUrl: "https://api.github.com/users/octo/orgs",
      })
    ).resolves.toEqual({
      success: true,
      data: {
        username: "octo",
        avatar_url: "https://img",
        url: "https://github.com/octo",
        type: "User",
        user_view_type: "public",
        name: "Octo",
        company: "GitHub",
        blog: "https://blog.example",
        location: "Earth",
        email: null,
        bio: "bio",
        public_repos: 10,
        followers: 20,
        following: 5,
        account_created_at: "2026-01-01T00:00:00.000Z",
        organizations: [],
      },
    });
  });

  it("returns a failure payload when fetch throws", async () => {
    const error = new Error("network down");
    fetchMock.mockRejectedValue(error);

    await expect(
      collect_viewer_info({
        senderUrl: "https://api.github.com/users/octo",
      })
    ).resolves.toEqual({
      success: false,
      message: "Failed to collect viewer's info",
      error,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
  });
});
