import { z } from "zod";
 
export const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export const signupSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(6),
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type SignupSchema = z.infer<typeof signupSchema>;