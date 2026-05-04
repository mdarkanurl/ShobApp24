import { ActionTypes, EventType } from "@prisma/client";
import { z } from "zod";
import { githubEventActionSupport } from "../github.action.types.rules";
import { sendEmailPushEventSchema_update, sendEmailToMePushEventSchema_update, sendEmailToWhoPushTheCommitSchema_update } from "./update-action-for-push-event.dto";
import { sendEmailRepoEventSchema_update } from "./update-action-for-repository-event.dto";
import { sendEmailToMeStarEvent_update } from "./update-action-for-star-event.dto";

const webhook_config_schema = z.object({
    url: z.string().url().refine((val) => {
        return !val.includes("localhost") && val.startsWith("https://");
    }, {
        message: "Only HTTPS & non-localhost URLs are allowed",
    })
});

const send_telegram_config_schema = z.object({
  message: z.string().trim().min(3).max(10000),
});

const send_email_to_who_send_the_trigger_config_schema = z.object({
  subject: z.string().trim().min(3).max(900),
  body: z.string().trim().min(3).max(10000)
});

const send_email_config_schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  subject: z.string().trim().min(3).max(900),
  body: z.string().trim().min(3).max(10000),
});

const send_email_to_me_config_schema = z.object({
  subject: z.string().trim().min(3).max(900),
  body: z.string().trim().min(3).max(10000),
});

export const baseUpdateActionByIdSchema = z.discriminatedUnion("type", [

    z.object({
        type: z.literal(ActionTypes.webhook),
        config: webhook_config_schema,
    }),

    z.object({
        type: z.literal(ActionTypes.send_telegram),
        config: send_telegram_config_schema,
    }),

    z.object({
        type: z.literal(ActionTypes.send_email_to_who_send_the_trigger),
        config: send_email_to_who_send_the_trigger_config_schema,
    }),

    z.object({
        type: z.literal(ActionTypes.send_email),
        config: send_email_config_schema,
    }),

    z.object({
        type: z.literal(ActionTypes.send_email_to_me),
        config: send_email_to_me_config_schema,
    }),

    // Repository event
    sendEmailRepoEventSchema_update,

    // Push event
    sendEmailPushEventSchema_update,
    sendEmailToMePushEventSchema_update,
    sendEmailToWhoPushTheCommitSchema_update,

    // Star event
    sendEmailToMeStarEvent_update,
]);

export function updateActionSchemaByEventType(eventType?: EventType) {
  return baseUpdateActionByIdSchema.superRefine((data, ctx) => {
    if (!eventType) return;

    const supportedActionTypes = githubEventActionSupport[eventType];

    if (!supportedActionTypes.includes(data.type)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["type"],
        message: `Action type ${data.type} is not supported for GitHub ${eventType} event`,
      });
    }
  });
}

export type UpdateActionByIdDto = z.infer<typeof baseUpdateActionByIdSchema>;
