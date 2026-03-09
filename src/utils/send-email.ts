import { Resend } from "resend";
import { channelForsendEmail, sendEmailQueue } from "./rabbitmq";
import { sendEmailDto } from "./dto/send-email.dto";
import "dotenv/config";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error("RESEND_API_KEY is not defined");
}

const resend = new Resend(apiKey);

export const startEmailConsumer = async () => {

  channelForsendEmail.consume(
    sendEmailQueue,
    async (msg) => {
      if (!msg) {
        console.warn("Consumer cancelled by server");
        return;
      }

      try {
        const raw = msg.content.toString("utf-8");

        let payload: sendEmailDto;

        try {
          payload = JSON.parse(raw);
        } catch (err) {
          console.error("Invalid JSON in queue message:", raw);
          channelForsendEmail.ack(msg);
          return;
        }

        const { email, subject, body } = payload;

        if (!email || !subject || !body) {
          console.error("Invalid email payload:", payload);
          channelForsendEmail.ack(msg);
          return;
        }

        const { data, error } = await resend.emails.send({
          from: "Find Decisions <onboarding@resend.dev>",
          to: [email],
          subject,
          html: body,
        });

        if (error) {
          console.error("Resend API error:", error);
          channelForsendEmail.nack(msg, false, true);
          return;
        }

        console.log("Email sent successfully:", {
          email,
          id: data?.id,
        });

        channelForsendEmail.ack(msg);
      } catch (err) {
        console.error("Unexpected error in email worker:", err);
        channelForsendEmail.nack(msg, false, true);
      }
    },
    {
      noAck: false,
    }
  );
};