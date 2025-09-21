import { IsOptional, IsString } from 'class-validator';

export class AskLegalQueryDto {
  @IsString()
  tenantId!: string;

  @IsString()
  userId!: string;

  @IsString()
  question!: string;

  @IsOptional()
  @IsString()
  category?: string; // "RBI" | "FEMA" | "GST" | "TDS" | "Custom"
}