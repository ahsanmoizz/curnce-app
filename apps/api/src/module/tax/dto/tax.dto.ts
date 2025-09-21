import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class FileTaxReturnDto {
  @IsString() type: string;   // "corporate" | "gst"
  @IsString() period: string; // e.g. "2025-Q2" or "2025-08"
}

export class RecordTaxPaymentDto {
  @IsString() taxReturnId: string;
  @IsNumber() amount: number;
  @IsDateString() paidDate: Date;
  @IsOptional() @IsString() reference?: string;
}
