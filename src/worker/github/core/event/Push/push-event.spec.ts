import { Push_event } from './push-event';
import { createPayload, createPrismaMock } from '../test-helpers';
import { collect_viewer_info } from '../../actions';

jest.mock('../../../../../utils/rabbitmq', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('../../actions', () => ({
  collect_viewer_info: jest.fn(),
  collect_viewer_email: jest.fn(),
}));

jest.mock('../../actions/ai_analytics_commit_message', () => ({
  AI_analytics_commit_messages: jest.fn(),
}));

const { sendEmail } = require('../../../../../utils/rabbitmq');
const {
  AI_analytics_commit_messages,
} = require('../../actions/ai_analytics_commit_message');

describe('Push_event', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('looks up push workflows with a null action', async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([{ id: 'action-1', step: 1 }]);
    prisma.workflowRun.create.mockResolvedValue({ id: 'run-1' });
    const instance = new Push_event(prisma as any);
    const findWorkflowSpy = jest
      .spyOn(instance, 'findWorkflow')
      .mockResolvedValue({ id: 'workflow-1' });
    jest.spyOn(instance, 'executeActions').mockResolvedValue({ success: true });

    await instance.Push_event({
      event: 'push',
      data: createPayload(),
    } as any);

    expect(findWorkflowSpy).toHaveBeenCalledWith({
      installationId: 101,
      repoId: 202,
      action: null,
    });
  });

  it('returns success when no workflow matches', async () => {
    const prisma = createPrismaMock();
    const instance = new Push_event(prisma as any);
    jest.spyOn(instance, 'findWorkflow').mockResolvedValue(null);

    await expect(
      instance.Push_event({
        event: 'push',
        data: createPayload(),
      } as any),
    ).resolves.toEqual({ success: true });

    expect(prisma.workflowRun.create).not.toHaveBeenCalled();
  });

  it('returns success when the workflow has no actions', async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([]);
    const instance = new Push_event(prisma as any);
    jest
      .spyOn(instance, 'findWorkflow')
      .mockResolvedValue({ id: 'workflow-1' });

    await expect(
      instance.Push_event({
        event: 'push',
        data: createPayload(),
      } as any),
    ).resolves.toEqual({ success: true });

    expect(prisma.workflowRun.create).not.toHaveBeenCalled();
  });

  it('creates and completes a workflow run when actions execute successfully', async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([{ id: 'action-1', step: 1 }]);
    prisma.workflowRun.create.mockResolvedValue({ id: 'run-1' });
    const instance = new Push_event(prisma as any);
    jest
      .spyOn(instance, 'findWorkflow')
      .mockResolvedValue({ id: 'workflow-1' });
    jest.spyOn(instance, 'executeActions').mockResolvedValue({ success: true });

    const result = await instance.Push_event({
      event: 'push',
      data: createPayload(),
    } as any);

    expect(prisma.workflowRun.create).toHaveBeenCalledWith({
      data: {
        workflowId: 'workflow-1',
        platform: 'GitHub',
        eventType: 'push',
        payload: JSON.stringify(createPayload()),
        status: 'Running',
      },
      select: {
        id: true,
      },
    });
    expect(prisma.workflowRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: {
        status: 'Succeeded',
        output: undefined,
        finishedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({ success: true });
  });

  it('marks the workflow run failed when executeActions returns a failure result', async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([{ id: 'action-1', step: 1 }]);
    prisma.workflowRun.create.mockResolvedValue({ id: 'run-1' });
    const instance = new Push_event(prisma as any);
    jest
      .spyOn(instance, 'findWorkflow')
      .mockResolvedValue({ id: 'workflow-1' });
    jest.spyOn(instance, 'executeActions').mockResolvedValue({
      success: false,
      message: 'Action failed',
      allUpTo: false,
      requeue: false,
    });

    const result = await instance.Push_event({
      event: 'push',
      data: createPayload(),
    } as any);

    expect(prisma.workflowRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: {
        status: 'Failed',
        output: JSON.stringify('Action failed'),
        finishedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      success: false,
      message: 'Action failed',
      allUpTo: false,
      requeue: false,
    });
  });

  it('marks the workflow run failed when executeActions throws', async () => {
    const prisma = createPrismaMock();
    prisma.action.findMany.mockResolvedValue([{ id: 'action-1', step: 1 }]);
    prisma.workflowRun.create.mockResolvedValue({ id: 'run-1' });
    const instance = new Push_event(prisma as any);
    jest
      .spyOn(instance, 'findWorkflow')
      .mockResolvedValue({ id: 'workflow-1' });
    jest.spyOn(instance, 'executeActions').mockRejectedValue(new Error('boom'));

    const result = await instance.Push_event({
      event: 'push',
      data: createPayload(),
    } as any);

    expect(prisma.workflowRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: {
        status: 'Failed',
        output: JSON.stringify(new Error('boom')),
        finishedAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      success: false,
      message: 'boom',
      allUpTo: false,
      requeue: true,
    });
  });

  it('loads viewer data once and caches the result', async () => {
    const instance = new Push_event(createPrismaMock() as any);
    (collect_viewer_info as jest.Mock).mockResolvedValue({
      success: true,
      data: { viewer: 1 },
    });

    const senderUrl = 'https://api.github.com/users/octo';
    const senderOrganizationsUrl = 'https://api.github.com/users/octo/orgs';

    const loader = (instance as any).createViewerDataLoader(
      createPayload({
        sender: {
          url: senderUrl,
          html_url: 'https://github.com/octo',
          organizations_url: senderOrganizationsUrl,
        },
      }),
    );

    const first = await loader();
    const second = await loader();

    expect(first).toEqual({
      success: true,
      data: { viewer: 1 },
    });
    expect(second).toEqual(first);
    expect(collect_viewer_info).toHaveBeenCalledTimes(1);
    expect(collect_viewer_info).toHaveBeenCalledWith({
      senderUrl,
      senderOrganizationsUrl,
    });
  });

  it('sends a plain push email without push info or analytics', async () => {
    const instance = new Push_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: 'send_email',
        config: {
          email: 'dev@example.com',
          subject: 'Push',
          body: 'Base body',
        },
      },
      createPayload(),
      jest.fn(),
    );

    expect(sendEmail).toHaveBeenCalledWith({
      email: 'dev@example.com',
      subject: 'Push',
      body: 'Base body',
    });
    expect(AI_analytics_commit_messages).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      output: { custom_message: 'The data is added to the queue.' },
    });
  });

  it('sends push emails with push info and AI analytics when requested', async () => {
    const instance = new Push_event(createPrismaMock() as any);
    AI_analytics_commit_messages.mockResolvedValue({
      success: true,
      data: 'analytics summary',
    });

    const payload = createPayload({
      commits: [{ message: 'test commit' }],
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: 'send_email',
        config: {
          email: 'dev@example.com',
          subject: 'Push',
          body: 'Base body',
          do_you_want_to_send_push_info: true,
          do_you_want_AI_analytics_of_push_data: true,
        },
      },
      payload,
      jest.fn(),
    );

    expect(sendEmail).toHaveBeenCalledWith({
      email: 'dev@example.com',
      subject: 'Push',
      body: `Base body\n\nPush info:\n${JSON.stringify(
        payload,
      )}\n\nAI analytics:\nanalytics summary`,
    });
    expect(result).toEqual({
      success: true,
      output: { custom_message: 'The data is added to the queue.' },
    });
  });

  it('returns analytics failure for send_email when AI analytics lookup fails', async () => {
    const instance = new Push_event(createPrismaMock() as any);
    AI_analytics_commit_messages.mockResolvedValue({
      success: false,
      message: 'analytics failed',
      error: 'analytics failed',
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: 'send_email',
        config: {
          email: 'dev@example.com',
          subject: 'Push',
          body: 'Base body',
          do_you_want_AI_analytics_of_push_data: true,
        },
      },
      createPayload({
        commits: [{ message: 'test commit' }],
      }),
      jest.fn(),
    );

    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: 'analytics failed',
      error: 'analytics failed',
    });
  });

  it('sends an email to me without push info or analytics', async () => {
    const instance = new Push_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: 'send_email_to_me',
        config: {
          email: 'me@example.com',
          subject: 'Push',
          body: 'Base body',
        },
      },
      createPayload(),
      jest.fn(),
    );

    expect(sendEmail).toHaveBeenCalledWith({
      email: 'me@example.com',
      subject: 'Push',
      body: 'Base body',
    });
    expect(result).toEqual({
      success: true,
      output: { custom_message: 'The data is added to the queue.' },
    });
  });

  it('sends an email to me with push info and analytics when requested', async () => {
    const instance = new Push_event(createPrismaMock() as any);
    AI_analytics_commit_messages.mockResolvedValue({
      success: true,
      data: 'analytics summary',
    });

    const payload = createPayload({
      commits: [{ message: 'test commit' }],
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: 'send_email_to_me',
        config: {
          email: 'me@example.com',
          subject: 'Push',
          body: 'Base body',
          do_you_want_push_info: true,
          do_you_want_AI_analytics_of_push_data: true,
        },
      },
      payload,
      jest.fn(),
    );

    expect(sendEmail).toHaveBeenCalledWith({
      email: 'me@example.com',
      subject: 'Push',
      body: `Base body\n\nPush info:\n${JSON.stringify(
        payload,
      )}\n\nAI analytics:\nanalytics summary`,
    });
    expect(result).toEqual({
      success: true,
      output: { custom_message: 'The data is added to the queue.' },
    });
  });

  it('returns analytics failure for send_email_to_me when AI analytics lookup fails', async () => {
    const instance = new Push_event(createPrismaMock() as any);
    AI_analytics_commit_messages.mockResolvedValue({
      success: false,
      message: 'analytics failed',
      error: 'analytics failed',
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: 'send_email_to_me',
        config: {
          email: 'me@example.com',
          subject: 'Push',
          body: 'Base body',
          do_you_want_AI_analytics_of_push_data: true,
        },
      },
      createPayload({
        commits: [{ message: 'test commit' }],
      }),
      jest.fn(),
    );

    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: 'analytics failed',
      error: 'analytics failed',
    });
  });

  it('returns failure when pusher email does not exist', async () => {
    const instance = new Push_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: 'send_email_to_who_push_the_commit',
        config: {
          subject: 'Push',
          body: 'Base body',
        },
      },
      createPayload({
        pusher: {
          email: '',
        },
      }),
      jest.fn(),
    );

    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: "pusher email doesn't exist",
      error: null,
    });
  });

  it('sends an email to the pusher with the configured body', async () => {
    const instance = new Push_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: 'send_email_to_who_push_the_commit',
        config: {
          subject: 'Push',
          body: 'Base body',
        },
      },
      createPayload(),
      jest.fn(),
    );

    expect(sendEmail).toHaveBeenCalledWith({
      email: 'pusher@example.com',
      subject: 'Push',
      body: 'Base body',
    });
    expect(result).toEqual({
      success: true,
      output: { custom_message: 'The data is added to the queue.' },
    });
  });

  it('sends an email to the pusher with analytics when requested', async () => {
    const instance = new Push_event(createPrismaMock() as any);
    AI_analytics_commit_messages.mockResolvedValue({
      success: true,
      data: 'analytics summary',
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: 'send_email_to_who_push_the_commit',
        config: {
          subject: 'Push',
          body: 'Base body',
          do_you_want_AI_analytics_of_push_data: true,
        },
      },
      createPayload({
        commits: [{ message: 'test commit' }],
      }),
      jest.fn(),
    );

    expect(sendEmail).toHaveBeenCalledWith({
      email: 'pusher@example.com',
      subject: 'Push',
      body: 'analytics summary',
    });
    expect(result).toEqual({
      success: true,
      output: { custom_message: 'The data is added to the queue.' },
    });
  });

  it('returns the branch failure when pusher analytics lookup fails', async () => {
    const instance = new Push_event(createPrismaMock() as any);
    AI_analytics_commit_messages.mockResolvedValue({
      success: false,
      message: 'analytics failed',
      error: 'analytics failed',
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: 'send_email_to_who_push_the_commit',
        config: {
          subject: 'Push',
          body: 'Base body',
          do_you_want_AI_analytics_of_push_data: true,
        },
      },
      createPayload({
        commits: [{ message: 'test commit' }],
      }),
      jest.fn(),
    );

    expect(sendEmail).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: "pusher email doesn't exist",
      error: null,
    });
  });

  it('returns webhook failure when the remote endpoint is not ok', async () => {
    const instance = new Push_event(createPrismaMock() as any);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('server error'),
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: 'webhook',
        config: {
          url: 'https://example.com/hook',
        },
      },
      createPayload(),
      jest.fn(),
    );

    expect(result).toEqual({
      success: false,
      message: 'Webhook returned 500',
      error: 'server error',
      requeue: false,
    });
  });

  it('returns webhook json output when the remote endpoint succeeds with json', async () => {
    const instance = new Push_event(createPrismaMock() as any);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('application/json'),
      },
      json: jest.fn().mockResolvedValue({ accepted: true }),
    });

    const payload = createPayload();

    const result = await (instance as any).executeSingleAction(
      {
        type: 'webhook',
        config: {
          url: 'https://example.com/hook',
        },
      },
      payload,
      jest.fn(),
    );

    expect(global.fetch).toHaveBeenCalledWith('https://example.com/hook', {
      method: 'POST',
      headers: {
        'User-Agent': 'ShobApp24-webhook',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    expect(result).toEqual({
      success: true,
      output: { accepted: true },
    });
  });

  it('returns webhook text output when the remote endpoint succeeds with text', async () => {
    const instance = new Push_event(createPrismaMock() as any);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('text/plain'),
      },
      text: jest.fn().mockResolvedValue('ok'),
    });

    const result = await (instance as any).executeSingleAction(
      {
        type: 'webhook',
        config: {
          url: 'https://example.com/hook',
        },
      },
      createPayload(),
      jest.fn(),
    );

    expect(result).toEqual({
      success: true,
      output: 'ok',
    });
  });

  it('returns a retryable failure when webhook fetch throws', async () => {
    const instance = new Push_event(createPrismaMock() as any);
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network failed'));

    const result = await (instance as any).executeSingleAction(
      {
        type: 'webhook',
        config: {
          url: 'https://example.com/hook',
        },
      },
      createPayload(),
      jest.fn(),
    );

    expect(result).toEqual({
      success: false,
      message: 'network failed',
      error: new Error('network failed'),
      requeue: true,
    });
  });

  it('returns a non-requeueable failure for send_telegram', async () => {
    const instance = new Push_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: 'send_telegram',
        config: {
          message: 'hello',
        },
      },
      createPayload(),
      jest.fn(),
    );

    expect(result).toEqual({
      success: false,
      message: 'send_telegram action is not implemented yet',
      requeue: false,
    });
  });

  it('returns a non-requeueable failure for unsupported actions', async () => {
    const instance = new Push_event(createPrismaMock() as any);

    const result = await (instance as any).executeSingleAction(
      {
        type: 'unknown_action',
        config: {},
      },
      createPayload(),
      jest.fn(),
    );

    expect(result).toEqual({
      success: false,
      message: 'Unsupported action type: unknown_action',
      requeue: false,
    });
  });

  it('returns a retryable failure when sendEmail throws', async () => {
    const instance = new Push_event(createPrismaMock() as any);
    sendEmail.mockRejectedValueOnce(new Error('mailer down'));

    const result = await (instance as any).executeSingleAction(
      {
        type: 'send_email',
        config: {
          email: 'dev@example.com',
          subject: 'Push',
          body: 'Base body',
        },
      },
      createPayload(),
      jest.fn(),
    );

    expect(result).toEqual({
      success: false,
      message: 'mailer down',
      error: new Error('mailer down'),
      requeue: true,
    });
  });
});
