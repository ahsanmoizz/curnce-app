import { IsDateString, IsString } from 'class-validator';

export class ClosePeriodDto {
  @IsString()
  period!: string;

  @IsDateString()
  startDate!: Date;

  @IsDateString()
  endDate!: Date;
}
