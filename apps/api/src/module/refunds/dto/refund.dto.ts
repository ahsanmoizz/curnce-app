// apps/api/src/module/refunds/dto/refund.dto.ts
import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class RefundDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  originalTransactionId: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  reason: string;
}
