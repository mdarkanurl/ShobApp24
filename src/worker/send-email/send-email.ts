import { Resend } from "resend";
import { ConfigService } from "@nestjs/config";
import { sendEmailQueue } from "../../utils/rabbitmq";
import amqplib from 'amqplib';
import { sendEmailDto } from "./dto/send-email.dto";
import "dotenv/config";

const configService = new ConfigService();
const apiKey = configService.get<string>("RESEND_API_KEY");

if (!apiKey) {
  throw new Error("RESEND_API_KEY is not defined");
}

const resend = new Resend(apiKey);

export const startEmailConsumer = async (channelForsendEmail: amqplib.Channel) => {

  channelForsendEmail.consume(
    sendEmailQueue,
    async (msg) => {
      if (!msg) {
        console.log("Consumer cancelled by server");
        return;
      }

      try {
        const raw = msg.content.toString("utf-8");

        let payload: sendEmailDto;

        try {
          payload = JSON.parse(raw);
        } catch (err) {
          console.error("Invalid JSON in queue message:", raw);
          channelForsendEmail.nack(msg, false, false);
          return;
        }

        const { email, subject, body } = payload;

        if (!email || !subject || !body) {
          console.error("Invalid email payload:", payload);
          channelForsendEmail.nack(msg, false, false);
          return;
        }

        const { data, error } = await resend.emails.send({
          from: "ShobApp24 <shopapp24@drakilo.com>",
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
