import { z } from 'zod';

export const UserSchema = z.object({
  id: z.int(),
  username: z.string(),
  name: z.string(),
  email: z.string(),
  role_id: z.int(),
  role: z.string()
});

export type User = z.infer<typeof UserSchema>;
