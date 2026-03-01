import { Controller, Get } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";

@Controller({ path: 'github', version: '1' })
export class GithubController{
    constructor() {}
}
