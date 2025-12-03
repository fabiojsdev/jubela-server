import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { EmployeeRole } from 'src/common/enums/employee-role.enum';
import { ROUTE_POLICY_KEY } from '../auth.constants';

@Injectable()
export class RoutePolicyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const routePolicyRequired = this.reflector.get<EmployeeRole | undefined>(
      ROUTE_POLICY_KEY,
      context.getHandler(),
    );
    return true;
  }
}
