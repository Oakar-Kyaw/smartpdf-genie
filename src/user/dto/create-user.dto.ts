import { Transform, Expose } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsDateString,
  IsInt,
} from 'class-validator';

export enum GenderEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export class CreateUserDto {
  // -------- User Base --------
  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly firstName?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly lastName?: string;

  @Expose()
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => (value ? String(value).trim().toLowerCase() : null))
  readonly email: string;

  @Expose()
  @IsOptional()
  @IsEnum(GenderEnum)
  @Transform(({ value }) =>
    value ? String(value).trim().toUpperCase() : 'MALE',
  )
  readonly gender?: GenderEnum;

  @Expose()
  @IsOptional()
  @IsString()
  @MinLength(6)
  @Transform(({ value }) => (value ? String(value).trim() : null))
  password?: string;

  @Expose()
  @IsOptional()
  readonly isSocialLogin?: boolean;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  readonly phone?: string;

  @Expose()
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => {
    if (typeof value === 'string' && value) {
      const d = new Date(value);
      return new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
      )
        .toISOString()
        .replace(/\.\d{3}Z$/, 'Z'); // strip milliseconds
    }
    return null;
  })
  readonly dateOfBirth?: string;

  @Expose()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value ? String(value).trim() : null))
  otp?: string;
}
