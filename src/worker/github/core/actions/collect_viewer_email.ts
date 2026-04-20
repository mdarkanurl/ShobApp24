import { ConfigService } from "@nestjs/config";
import * as Cheerio from "cheerio";
import { Actions_function_type } from "../../types/actions-function-type";

const configService = new ConfigService();

export async function collect_viewer_email(html_url: string): Promise<Actions_function_type> {
    try {
        const user_session = configService.get<string>('USER_SESSION');

        // TODO add here headless browser
        const res = await  fetch(html_url, {
            headers: {
            Cookie: `user_session=${user_session}`
            }
        });

        const html = await res.text();

        const $ = Cheerio.load(html);
        const emailElement = $('li[itemprop="email"] a');
        if (!emailElement.length) return {
            success: false,
            message: "email doesn't exist",
        };

        // Option 1: get text
        const emailText = emailElement.text().trim();

        // Option 2: extract from mailto
        const href = emailElement.attr("href"); // mailto:xxx

        if (href && href.startsWith("mailto:")) {
            const emailText = href.replace("mailto:", "");

            return {
                success: true,
                data: emailText
            };
        }

        return {
            success: true,
            data: emailText
        };
    } catch (error) {
        return {
            success: false,
            message: "Failed to collect viewer email",
            error: error
        }
    }
}

