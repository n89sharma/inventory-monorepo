import { z } from 'zod';

export const UserSchema = z.object({
  id: z.int(),
  name: z.string(),
  email: z.string().nullable(),
  role_id: z.int().nullable(),
  role: z.string()
});

export type User = z.infer<typeof UserSchema>;
