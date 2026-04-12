import { Class_methods_type } from "./types/class-methods-type";
import {
    Installation_event,
    Issues_event,
    Star_event
} from "./core";

const installation_event = new Installation_event();
const issues_event = new Issues_event();
const star_event = new Star_event();


export async function main(payload: any): Promise<Class_methods_type> {
    try {

        switch (payload.event) {
          case "installation":
            const installationEvent = await installation_event
              .Installation_event(payload);

            if(!installationEvent.success) {
              return {
                success: false,
                message: "",
                allUpTo: installationEvent.allUpTo,
                requeue: installationEvent.requeue
              }
            }
            return {
                success: true
            };

          case "star":
            const starEvent = await star_event
              .Star_event(payload);

            if(!starEvent.success) {
              return {
                success: false,
                message: starEvent.message,
                allUpTo: starEvent.allUpTo,
                requeue: starEvent.requeue
              }
            }
            return {
                success: true
            };

          case "issues":
            
            break;

        
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

