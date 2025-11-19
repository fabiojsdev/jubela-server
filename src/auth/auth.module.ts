import { Global, Module } from '@nestjs/common';
import { BcryptService } from './hashing/bcrypt.service';
import { HashingServiceProtocol } from './hashing/hashing.service';

@Global()
@Module({
  providers: [
    {
      provide: HashingServiceProtocol,
      useClass: BcryptService,
    },
  ],
  exports: [HashingServiceProtocol],
})
export class AuthModule {}
