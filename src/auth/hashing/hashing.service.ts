export abstract class HashingServiceProtocol {
  abstract Hash(password: string): Promise<string>;
  abstract Compare(password: string, passwordHash: string): Promise<boolean>;
}
