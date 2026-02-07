import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isDecimalString', async: false })
export class IsDecimalStringConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    if (typeof value !== 'string') {
      return false;
    }

    // Valida se é um número decimal válido
    const decimalRegex = /^\d+(\.\d+)?$/;
    return decimalRegex.test(value.trim());
  }

  defaultMessage() {
    return 'price must be a valid decimal number string (e.g., "59.99")';
  }
}

export function IsDecimalString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsDecimalStringConstraint,
    });
  };
}
