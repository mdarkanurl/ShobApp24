import { githubStarEventSchemaDto } from "../dto/github-star-webhook.dto";
import { collect_viewer_email } from "./collect_viewer_email";

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
        if(!user_Info.email) user_Info.email = collect_viewer_email(userInfoFromGithub.html_url);
        return user_Info;
        
    } catch (error) {
        console.error(error);
        return null;
    }
}


