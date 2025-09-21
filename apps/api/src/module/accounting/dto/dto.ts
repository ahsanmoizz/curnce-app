import { IsDateString, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAccountDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsString() type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  @IsOptional() parentId?: string;
}

export class CreateJournalEntryLineDto {
  @IsString() accountId: string;
  @IsNumber() debit: number;
  @IsNumber() credit: number;
}

export class CreateJournalEntryDto {
  @IsDateString() date: Date;
  @IsString() description: string;
  @ValidateNested({ each: true })
  @Type(() => CreateJournalEntryLineDto)
  lines: CreateJournalEntryLineDto[];
}
