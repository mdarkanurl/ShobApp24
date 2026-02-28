import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { auth } from "./lib/auth";
import { LocalAuthModule } from "./auth/auth.module";
import config from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      envFilePath: `.env`,
    }),
    PrismaModule,
    LocalAuthModule,
    AuthModule.forRoot({ auth }),
  ]
})
export class AppModule {}
