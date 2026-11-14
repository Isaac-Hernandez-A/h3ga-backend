import { ValueTransformer } from 'typeorm';

// PostgreSQL devuelve NUMERIC como texto; las entidades lo exponen como number.
export const numericTransformer: ValueTransformer = {
  to: (valor?: number | null) => valor,
  from: (valor?: string | null) => (valor === null || valor === undefined ? valor : Number(valor)),
};
