import { EmployeeRole } from 'src/common/enums/employee-role.enum';

export class TokenPayloadDTO {
  sub: string;
  email: string;
  role: EmployeeRole;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}
