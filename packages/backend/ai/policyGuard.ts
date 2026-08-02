import type { PolicyResult } from './types.js';

const BLOCKED_RULES: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\b(diagnostico|diagnóstico|que tengo|que me pasa|qué tengo|qué me pasa)\b/i,
    reason: 'No puedo realizar diagnosticos medicos. Consulta a un profesional de salud.',
  },
  {
    pattern: /\b(dosis|dosificacion|dosificación|cuanto tomar|cuánto tomar|cada cuantas horas|cada cuántas horas)\b/i,
    reason: 'No puedo recomendar dosis ni pautas de consumo. Consulta a tu medico o farmaceutico.',
  },
  {
    pattern: /\b(automedicar|automedicacion|automedicación|recetame|recétame|tratamiento para)\b/i,
    reason: 'No puedo apoyar automedicacion ni indicar tratamientos. Consulta a un profesional de salud.',
  },
  {
    pattern: /\b(autotratamiento|auto\s?tratar|que me sirve para|que tomar para|qué me sirve para|qué tomar para|medicamento para)\b/i,
    reason: 'No puedo apoyar automedicacion ni indicar tratamientos. Consulta a un profesional de salud.',
  },
  {
    pattern: /\b(sintomas|síntomas|fiebre|dolor de|tos|gripe|infeccion|infección)\b/i,
    reason: 'No puedo evaluar sintomas ni sugerir tratamiento. Consulta a un profesional de salud.',
  },
];

export function evaluatePolicy(message: string): PolicyResult {
  const text = message.trim();

  for (const rule of BLOCKED_RULES) {
    if (rule.pattern.test(text)) {
      return { blocked: true, reason: rule.reason };
    }
  }

  return { blocked: false, reason: '' };
}
