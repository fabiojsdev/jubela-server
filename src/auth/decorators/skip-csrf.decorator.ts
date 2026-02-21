// src/common/decorators/skip-csrf.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { SKIP_CSRF_KEY } from '../auth.constants';

export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);
