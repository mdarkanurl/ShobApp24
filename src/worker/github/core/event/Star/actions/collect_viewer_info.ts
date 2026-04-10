import Cheerio from "cheerio";
import { githubStarEventSchemaDto } from "../dto/github-star-webhook.dto";
import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();

export async function collect_viewer_info(data: githubStarEventSchemaDto) {
    try {
        const payload = data.data;
        const user_Info: any = {};

        // get viewer profile data
        const response = await fetch(payload.sender.url);
        const userInfoFromGithub = await response.json();
        
        user_Info.username = userInfoFromGithub.login;
        user_Info.avatar_url = userInfoFromGithub.avatar_url;
        user_Info.url = userInfoFromGithub.html_url;
        user_Info.type = userInfoFromGithub.type;
        user_Info.user_view_type = userInfoFromGithub.user_view_type;
        user_Info.name = userInfoFromGithub.name;
        user_Info.company = userInfoFromGithub.company;
        user_Info.blog = userInfoFromGithub.blog;
        user_Info.location = userInfoFromGithub.location;
        user_Info.email = userInfoFromGithub.email;
        user_Info.bio = userInfoFromGithub.bio;
        user_Info.public_repos = userInfoFromGithub.public_repos;
        user_Info.followers = userInfoFromGithub.followers;
        user_Info.following = userInfoFromGithub.following;
        user_Info.account_created_at = userInfoFromGithub.created_at;

        // get organizations data
        const organizations = await fetch(payload.sender.organizations_url);
        const organizationsInfoFromGithub = await organizations.json();

        user_Info.organizations = [];
        for (let i = 0; i < organizationsInfoFromGithub.length; i++) {
            user_Info.organizations.push({
                organization_username: organizationsInfoFromGithub[i].login,
                organization_avatar_url: organizationsInfoFromGithub[i].avatar_url,
                organization_description: organizationsInfoFromGithub[i].description,
            });
        }

        // Get email

        const user_session = configService.get<string>('USER_SESSION');
        const res = await fetch(userInfoFromGithub.html_url, {
            headers: {
            Cookie: `user_session=${user_session}`
            }
        });

        const html = await res.text();

        const $ = Cheerio.load(html);
        const emailElement = $('li[itemprop="email"] a');
        if (!emailElement.length) return user_Info;

        // Option 1: get text
        const emailText = emailElement.text().trim();

        // Option 2: extract from mailto
        const href = emailElement.attr("href"); // mailto:xxx

        if (href && href.startsWith("mailto:")) {
            const emailText = href.replace("mailto:", "");

            user_Info.email = emailText;
            return user_Info;
        }

        user_Info.email = emailText;
        return user_Info;
    } catch (error) {
        console.error(error);
    }
}


