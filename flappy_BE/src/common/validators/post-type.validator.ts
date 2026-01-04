import { 
  ValidatorConstraint, 
  ValidatorConstraintInterface, 
  ValidationArguments,
  registerDecorator,
  ValidationOptions 
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { FeatureFlagsService } from '../services/feature-flags.service';

@ValidatorConstraint({ name: 'isValidPostType', async: false })
@Injectable()
export class PostTypeValidator implements ValidatorConstraintInterface {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  validate(type: string, args: ValidationArguments) {
    if (!type) return false;
    
    const enabledTypes = this.featureFlagsService.getEnabledPostTypes();
    return enabledTypes.includes(type);
  }

  defaultMessage(args: ValidationArguments) {
    const enabledTypes = this.featureFlagsService.getEnabledPostTypes();
    return `Post type must be one of: ${enabledTypes.join(', ')}. Some post types may be disabled by feature flags.`;
  }
}

export function IsValidPostType(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: PostTypeValidator,
    });
  };
}