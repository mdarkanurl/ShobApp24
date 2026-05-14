import { Actions_function_type } from "../../types/actions-function-type";
import { GoogleGenAI } from "@google/genai";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if(!GEMINI_API_KEY) throw Error("GEMINI_API_KEY is not defined in env");

const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY
});

export async function AI_analytics_commit_messages(
    prisma: PrismaClient,
    workflowId: string,
    commitMessage: string
): Promise<Actions_function_type> {
    try {
        const data = await prisma.workflowRun.findMany({
            where: {
                platform: "GitHub",
                eventType: "push",
                workflowId
            },
            select: {
                payload: true
            },
            take: 20
        }) as any;

        const commitMessages = data.map((data) => {
            return data.payload.commits.map(msg => msg.message);
        }) as string[];

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            config: {
                systemInstruction: "You're an analysit who analysis GitHub commit messages"
            },
            contents: `analysit these commit message: ${commitMessage}. Tell me are these good commit message or not and are these following format of other commit message or not.
                Here are other commit message: ${commitMessages.join(", ")}`,
        });

        if(!response.text) return { success: false, message: "" }
        return {
            success: true,
            data: response.text
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('AI analytics commit message error:', errorMessage);
        return {
            success: false,
            message: errorMessage,
            error
        };
    }
}

