import { IsDateString, IsEmail, IsNumber, IsString } from 'class-validator';

export class CreateEmployeeDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() role: string;
  @IsNumber() salary: number;
}

export class RunPayrollDto {
  @IsString() period: string; // "2025-08"
  @IsDateString() startDate: Date;
  @IsDateString() endDate: Date;
}
