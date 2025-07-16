
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Check if user with this email already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash the password using Bun's built-in password hashing
    const hashedPassword = await Bun.password.hash(input.password, {
      algorithm: 'bcrypt',
      cost: 10
    });

    // Insert new user
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: hashedPassword
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
