import { IsDateString, IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateVendorDto {
  @IsString() name!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
}

export class CreateBillDto {
  @IsString() vendorId!: string;
  @IsString() invoiceNo!: string;
  @IsNumber() amount!: number;
  @IsDateString() dueDate!: Date | string;
}

export class RecordBillPaymentDto {
  @IsString() billId!: string;
  @IsNumber() amount!: number;
  @IsDateString() paidDate!: Date | string;
  @IsString() method!: string; // bank transfer, cheque, cash, etc.
}
