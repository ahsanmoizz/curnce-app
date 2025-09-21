import { IsDateString, IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsString() name!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
}

export class CreateInvoiceDto {
  @IsString() customerId!: string;
  @IsString() invoiceNo!: string;
  @IsNumber() amount!: number;
  @IsDateString() dueDate!: Date;
}

export class RecordInvoicePaymentDto {
  @IsString() invoiceId!: string;
  @IsNumber() amount!: number;
  @IsDateString() paidDate!: Date;
  @IsString() method!: string;
}
