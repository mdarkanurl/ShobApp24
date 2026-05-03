import { Workflow_run_event } from "./workflow_run-event";
import { createPayload, createPrismaMock } from "../test-helpers";
import { collect_viewer_info } from "../../actions";

jest.mock("../../../../../utils/rabbitmq", () => ({
  sendEmail: jest.fn(),
}));

jest.mock("../../actions", () => ({
  collect_viewer_info: jest.fn(),
  collect_viewer_email: jest.fn(),
}));

describe("Workflow_run_event", () => {
  it("returns success when installation data is missing", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);

    await expect(instance.Workflow_run_event({
        event: "workflow_run",
        data: createPayload({ installation: undefined }),
      } as any)
    ).resolves.toEqual({ success: true });
  });

  it("returns a non-requeueable failure when sender html url is missing", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: "send_email_to_who_send_the_trigger",
        config: {
          subject: "Subject",
          body: "Body",
        },
      },
      createPayload({
        sender: {
          url: "https://api.github.com/users/octo",
          html_url: "",
          organizations_url: "https://api.github.com/users/octo/orgs",
        },
      }),
      jest.fn()
    );

    expect(result).toEqual({
      success: false,
      message: "Missing sender.html_url in workflow_run payload",
      requeue: false,
    });
  });

  it("returns viewer-data failure when sender url is missing", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    const loader = (instance as any).createViewerDataLoader(
      createPayload({
        sender: {
          url: "",
          html_url: "https://github.com/octo",
          organizations_url: "https://api.github.com/users/octo/orgs",
        },
      })
    );

    const first = await loader();
    const second = await loader();

    expect(first).toEqual({
      success: false,
      message: "Missing sender.url in workflow_run payload",
      error: "missing_sender_url",
    });
    expect(second).toEqual(first);
    expect(collect_viewer_info).not.toHaveBeenCalled();
  });

  it("returns viewer-data when sender url is exist", async () => {
    const instance = new Workflow_run_event(createPrismaMock() as any);
    (collect_viewer_info as jest.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    const url = "https://api.github.com/users/octo";
    const organizations_url = "https://api.github.com/users/octo/orgs"

    const loader = (instance as any).createViewerDataLoader(
      createPayload({
        sender: {
          url,
          html_url: "https://github.com/octo",
          organizations_url,
        },
      })
    );

    const first = await loader();
    const second = await loader();

    expect(first).toEqual({
      success: true,
      data: {}
    });
    expect(second).toEqual(first);
    expect(collect_viewer_info).toHaveBeenCalledWith({
      senderUrl: url,
      senderOrganizationsUrl: organizations_url
    });
  });
});
