import { SetMetadata } from '@nestjs/common';
import { EmployeeRole } from 'src/common/enums/employee-role.enum';
import { ROUTE_POLICY_KEY } from '../auth.constants';

export const SetRoutePolicy = (policy: EmployeeRole) => {
  return SetMetadata(ROUTE_POLICY_KEY, policy);
};
