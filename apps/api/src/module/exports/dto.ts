import { IsOptional, IsString, IsNumberString } from 'class-validator';


export class PaymentFilterDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() tenantId?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsNumberString() limit?: string;
  @IsOptional() @IsString() format?: 'csv' | 'xlsx' | 'pdf';
}

export class LedgerFilterDto {
  @IsOptional() @IsString() account?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsNumberString() limit?: string;
  @IsOptional() @IsString() format?: 'csv' | 'xlsx' | 'pdf';
}

export class LegalQueryFilterDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsNumberString() limit?: string;
  @IsOptional() @IsString() format?: 'csv' | 'xlsx' | 'pdf';
}

export class AuditFilterDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsNumberString() limit?: string;
  @IsOptional() @IsString() format?: 'csv' | 'xlsx' | 'pdf';
}
