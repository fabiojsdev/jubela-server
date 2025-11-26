import { EmployeeRole } from 'src/common/enums/employee-role.enum';

export class TokenPayloadDTO {
  sub: string;
  role: EmployeeRole;
  email: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}
