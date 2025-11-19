import * as bcrypt from 'bcryptjs';
import { HashingServiceProtocol } from './hashing.service';

export class BcryptService extends HashingServiceProtocol {
  async Hash(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    const hashCreate = await bcrypt.hash(password, salt);
    return hashCreate;
  }

  async Compare(password: string, passwordHash: string): Promise<boolean> {
    const compare = await bcrypt.compare(password, passwordHash);
    return compare;
  }
}
