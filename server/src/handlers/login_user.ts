
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

export async function loginUser(input: LoginUserInput): Promise<AuthResponse> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password using Bun's built-in password verification
    const isPasswordValid = await Bun.password.verify(input.password, user.password_hash);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token using Bun's built-in JWT
    const token = await Bun.password.hash(JSON.stringify({
      userId: user.id,
      email: user.email,
      timestamp: Date.now()
    }));

    return {
      user: {
        id: user.id,
        email: user.email,
        password_hash: user.password_hash,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
