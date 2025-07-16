
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

const testInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with valid input', async () => {
    const result = await createUser(testInput);

    expect(result.email).toEqual('test@example.com');
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].password_hash).toBeDefined();
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should hash the password correctly', async () => {
    const result = await createUser(testInput);

    // Verify password is hashed with bcrypt
    const isValidPassword = await Bun.password.verify('password123', result.password_hash);
    expect(isValidPassword).toBe(true);

    // Verify wrong password fails
    const isWrongPassword = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isWrongPassword).toBe(false);
  });

  it('should throw error for duplicate email', async () => {
    await createUser(testInput);

    await expect(createUser(testInput)).rejects.toThrow(/already exists/i);
  });

  it('should create multiple users with different emails', async () => {
    const user1 = await createUser(testInput);
    const user2Input: CreateUserInput = {
      email: 'user2@example.com',
      password: 'password456'
    };
    const user2 = await createUser(user2Input);

    expect(user1.email).toEqual('test@example.com');
    expect(user2.email).toEqual('user2@example.com');
    expect(user1.id).not.toEqual(user2.id);

    // Verify both users exist in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(2);
  });
});
