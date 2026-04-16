import { Class_methods_type } from "./types/class-methods-type";
import {
    Commit_comment_event,
    Create_event,
    Fork_event,
    Issue_comment_event,
    Installation_event,
    Issues_event,
    Star_event,
    Watch_event
} from "./core";

const installation_event = new Installation_event();
const issues_event = new Issues_event();
const star_event = new Star_event();
const fork_event = new Fork_event();
const commit_comment_event = new Commit_comment_event();
const issue_comment_event = new Issue_comment_event();
const watch_event = new Watch_event();
const create_event = new Create_event();


export async function main(payload: any): Promise<Class_methods_type> {
    try {

        switch (payload.event) {
          case "installation":
            return await installation_event.Installation_event(payload);

          case "star":
            return await star_event.Star_event(payload);

          case "issues":
            return await issues_event.Issues_event(payload);

          case "fork":
            return await fork_event.Fork_event(payload);

          case "commit_comment":
            return await commit_comment_event.Commit_comment_event(payload);

          case "issue_comment":
            return await issue_comment_event.Issue_comment_event(payload);

          case "watch":
            return await watch_event.Watch_event(payload);

          case "create":
            return await create_event.Create_event(payload);

          default:
            console.log("Unknown event");
            return {
                success: true
            };
        }
    } catch (error) {
        return {
            success: false,
            message: "",
            allUpTo: false,
            requeue: true
        }
    }
}

