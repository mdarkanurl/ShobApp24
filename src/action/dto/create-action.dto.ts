import { ActionTypes, EventType, Platform } from "@prisma/client";
import { z } from "zod";
import { githubEventActionSupport } from "../github.action.types.rules";
import { sendEmailPushEventSchema, sendEmailToMePushEventSchema } from "./create-action-for-push-event";
import { sendEmailToMeStarEvent, sendEmailToWhoStarTheRepo } from "./create-action-for-star-event.dto";


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

const baseCreateActionSchema = z.discriminatedUnion("type", [

  // common event type and schema
  z.object({
    platform: z.nativeEnum(Platform),
    type: z.literal(ActionTypes.collect_viewer_data),
    step: z.number(),
  }),

  z.object({
    platform: z.nativeEnum(Platform),
    type: z.literal(ActionTypes.webhook),
    config: webhook_config_schema,
    step: z.number(),
  }),

  z.object({
    platform: z.nativeEnum(Platform),
    type: z.literal(ActionTypes.send_telegram),
    config: send_telegram_config_schema,
    step: z.number(),
  }),

  z.object({
    platform: z.nativeEnum(Platform),
    type: z.literal(ActionTypes.analytics_data_by_AI),
    step: z.number(),
  }),

  // Push event
  sendEmailPushEventSchema,
  sendEmailToMePushEventSchema,

  // Star event
  sendEmailToWhoStarTheRepo,
  sendEmailToMeStarEvent

  // Issues event

]);

export function createActionSchemaByEventType(eventType?: EventType) {
  return baseCreateActionSchema.superRefine((data, ctx) => {
    if (data.platform !== Platform.GitHub || !eventType) {
      return;
    }

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

export const createActionSchema = createActionSchemaByEventType();
export type createActionDto = z.infer<typeof baseCreateActionSchema>;
