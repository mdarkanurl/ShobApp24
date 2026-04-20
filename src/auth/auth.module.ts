import { Module } from '@nestjs/common';
import { AuthServiceLocal } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  providers: [AuthServiceLocal],
  controllers: [AuthController],
  exports: [AuthServiceLocal],
})
export class LocalAuthModule {}