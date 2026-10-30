import { ArrayUnique, IsArray, IsInt } from 'class-validator';

export class ReemplazarObjetivosEspecificosDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  objetivo_ids: number[];
}
