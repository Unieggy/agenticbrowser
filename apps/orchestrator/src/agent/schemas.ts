/**
 * Action schemas using Zod
 */

import { z } from 'zod';

export const ActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('VISION_CLICK'),
    regionId: z.string(),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal('DOM_CLICK'),
    selector: z.string().optional(),
    role: z.enum(['button', 'link', 'textbox', 'checkbox', 'radio']).optional(),
    name: z.string().optional(),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal('DOM_FILL'),
    selector: z.string().optional(),
    role: z.enum(['textbox']).optional(),
    name: z.string().optional(),
    value: z.string(),
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal('WAIT'),
    duration: z.number().optional(),
    until: z.string().optional(), // e.g., "networkidle", "load"
    description: z.string().optional(),
  }),
  z.object({
    type: z.literal('ASK_USER'),
    message: z.string(),
    actionId: z.string().optional(),
  }),
  z.object({
    type: z.literal('CONFIRM'),
    message: z.string(),
    actionId: z.string().optional(),
  }),
  z.object({
    type: z.literal('DONE'),
    reason: z.string().optional(),
  }),
]);
export type Action = z.infer<typeof ActionSchema>;

export const DecisionSchema=z.object({
  action: ActionSchema,
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
});



export type Decision = z.infer<typeof DecisionSchema>;

