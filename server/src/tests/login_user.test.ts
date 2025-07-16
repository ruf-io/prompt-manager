
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test input
const testInput: LoginUserInput = {
  email: 'test@example.com',
  password: 'password123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with valid credentials', async () => {
    // Create a user first
    const passwordHash = await Bun.password.hash(testInput.password);
    await db.insert(usersTable)
      .values({
        email: testInput.email,
        password_hash: passwordHash
      })
      .execute();

    const result = await loginUser(testInput);

    // Verify user data
    expect(result.user.email).toEqual(testInput.email);
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);
    expect(result.user.password_hash).toEqual(passwordHash);

    // Verify token is generated
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token!.length).toBeGreaterThan(0);
  });

  it('should throw error for non-existent user', async () => {
    await expect(loginUser(testInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for invalid password', async () => {
    // Create user with different password
    const passwordHash = await Bun.password.hash('different_password');
    await db.insert(usersTable)
      .values({
        email: testInput.email,
        password_hash: passwordHash
      })
      .execute();

    await expect(loginUser(testInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should return user with correct structure', async () => {
    // Create a user first
    const passwordHash = await Bun.password.hash(testInput.password);
    const insertResult = await db.insert(usersTable)
      .values({
        email: testInput.email,
        password_hash: passwordHash
      })
      .returning()
      .execute();

    const result = await loginUser(testInput);

    // Verify all required fields are present
    expect(result.user).toMatchObject({
      id: insertResult[0].id,
      email: testInput.email,
      password_hash: passwordHash,
      created_at: expect.any(Date),
      updated_at: expect.any(Date)
    });
  });
});
