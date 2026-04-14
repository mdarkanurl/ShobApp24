import { Class_methods_type } from "./types/class-methods-type";
import {
    Fork_event,
    Installation_event,
    Issues_event,
    Star_event
} from "./core";

const installation_event = new Installation_event();
const issues_event = new Issues_event();
const star_event = new Star_event();
const fork_event = new Fork_event();


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

          default:
            console.log("Unknown event");
            return {
                success: true
            };
        }

        return {
            success: true
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

