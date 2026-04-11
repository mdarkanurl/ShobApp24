import { ActionTypes, Platform } from "@prisma/client";
import { z } from "zod";

const collect_viewer_data_config_schema = z.object({

});

const send_email_to_who_send_the_trigger_config_schema = z.object({
    subject: z.string().trim().min(3).max(900),
    body: z.string().trim().min(3).max(10000)
});

const send_email_to_me_config_schema = z.object({
    email: z.string().trim().toLowerCase().email(),
    subject: z.string().trim().min(3).max(900).optional(),
    body: z.string().trim().min(3).max(10000).optional(),
    do_you_want_viewer_info: z.boolean().default(true)
});

const send_email_config_schema = z.object({
    email: z.string().trim().toLowerCase().email(),
    subject: z.string().trim().min(3).max(900),
    body: z.string().trim().min(3).max(10000),
    do_you_wanto_to_send_viewer_info: z.boolean().default(false)
});

const webhook_config_schema = z.object({
    url: z.string().url().refine((val) => {
        return !val.includes("localhost") && val.startsWith("https://");
    }, {
        message: "Only HTTPS & non-localhost URLs are allowed",
    })
});

const send_telegram_config_schema = z.object({
    message: z.string().trim().min(3).max(10000),
    do_you_want_viewer_info: z.boolean().default(true)
});

export const createActionSchema = z.discriminatedUnion("type", [
  z.object({
    platform: z.nativeEnum(Platform),
    type: z.literal(ActionTypes.collect_viewer_data),
    config: collect_viewer_data_config_schema.optional(),
    step: z.number(),
  }),


  z.object({
    platform: z.nativeEnum(Platform),
    type: z.literal(ActionTypes.send_email_to_who_send_the_trigger),
    config: send_email_to_who_send_the_trigger_config_schema,
    step: z.number(),
  }),

  z.object({
    platform: z.nativeEnum(Platform),
    type: z.literal(ActionTypes.send_email),
    config: send_email_config_schema,
    step: z.number(),
  }),

  z.object({
    platform: z.nativeEnum(Platform),
    type: z.literal(ActionTypes.send_email_to_me),
    config: send_email_to_me_config_schema,
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
]);

export type createActionDto = z.infer<typeof createActionSchema>;
