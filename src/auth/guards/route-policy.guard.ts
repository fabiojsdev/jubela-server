import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { EmployeeRole } from 'src/common/enums/employee-role.enum';
import { REQUEST_TOKEN_PAYLOAD_KEY, ROUTE_POLICY_KEY } from '../auth.constants';

@Injectable()
export class RoutePolicyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const routePolicyRequired = this.reflector.get<EmployeeRole | undefined>(
      ROUTE_POLICY_KEY,
      context.getHandler(),
    );

    // Se o controller ou método não tiver o permissões configuradas a request passa daqui
    if (!routePolicyRequired) return true;

    const token = request[REQUEST_TOKEN_PAYLOAD_KEY];

    if (!token) {
      throw new UnauthorizedException('Usuário não logado');
    }

    const { role } = token;

    if (!role) {
      throw new UnauthorizedException('Somente funcionários');
    }

    if (role === EmployeeRole.ADMIN) return true;

    if (!role.includes(routePolicyRequired)) {
      throw new UnauthorizedException(
        `Permissão ${routePolicyRequired} necessária`,
      );
    }

    return true;
  }
}
