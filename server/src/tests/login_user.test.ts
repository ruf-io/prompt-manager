
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test user data
const testUser = {
  email: 'test@example.com',
  password: 'testpassword123'
};

const testLoginInput: LoginUserInput = {
  email: 'test@example.com',
  password: 'testpassword123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully login with valid credentials', async () => {
    // Create test user first
    const passwordHash = await Bun.password.hash(testUser.password);
    await db.insert(usersTable).values({
      email: testUser.email,
      password_hash: passwordHash
    }).execute();

    const result = await loginUser(testLoginInput);

    // Verify user data is returned
    expect(result.user).toBeDefined();
    expect(result.user.email).toEqual(testUser.email);
    expect(result.user.id).toBeDefined();
    expect(result.user.password_hash).toEqual(passwordHash);
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Verify token is generated
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token!.length).toBeGreaterThan(0);

    // Verify token contains expected data
    const tokenData = JSON.parse(atob(result.token!));
    expect(tokenData.userId).toEqual(result.user.id);
    expect(tokenData.email).toEqual(testUser.email);
    expect(tokenData.timestamp).toBeDefined();
  });

  it('should reject login with invalid email', async () => {
    // Create test user first
    const passwordHash = await Bun.password.hash(testUser.password);
    await db.insert(usersTable).values({
      email: testUser.email,
      password_hash: passwordHash
    }).execute();

    const invalidEmailInput: LoginUserInput = {
      email: 'nonexistent@example.com',
      password: 'testpassword123'
    };

    await expect(loginUser(invalidEmailInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should reject login with invalid password', async () => {
    // Create test user first
    const passwordHash = await Bun.password.hash(testUser.password);
    await db.insert(usersTable).values({
      email: testUser.email,
      password_hash: passwordHash
    }).execute();

    const invalidPasswordInput: LoginUserInput = {
      email: testUser.email,
      password: 'wrongpassword'
    };

    await expect(loginUser(invalidPasswordInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should reject login when user does not exist', async () => {
    // No user created - database is empty
    await expect(loginUser(testLoginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should handle multiple users with same password correctly', async () => {
    // Create two users with same password
    const passwordHash = await Bun.password.hash(testUser.password);
    
    await db.insert(usersTable).values([
      {
        email: 'user1@example.com',
        password_hash: passwordHash
      },
      {
        email: 'user2@example.com',
        password_hash: passwordHash
      }
    ]).execute();

    // Login as first user
    const result1 = await loginUser({
      email: 'user1@example.com',
      password: testUser.password
    });

    // Login as second user
    const result2 = await loginUser({
      email: 'user2@example.com',
      password: testUser.password
    });

    // Verify different users are returned
    expect(result1.user.email).toEqual('user1@example.com');
    expect(result2.user.email).toEqual('user2@example.com');
    expect(result1.user.id).not.toEqual(result2.user.id);

    // Verify tokens are different
    expect(result1.token).toBeDefined();
    expect(result2.token).toBeDefined();
    expect(result1.token).not.toEqual(result2.token);
  });

  it('should generate unique tokens for same user on different logins', async () => {
    // Create test user
    const passwordHash = await Bun.password.hash(testUser.password);
    await db.insert(usersTable).values({
      email: testUser.email,
      password_hash: passwordHash
    }).execute();

    // Login twice with small delay to ensure different timestamps
    const result1 = await loginUser(testLoginInput);
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    const result2 = await loginUser(testLoginInput);

    // Verify same user data but different tokens
    expect(result1.user.id).toEqual(result2.user.id);
    expect(result1.user.email).toEqual(result2.user.email);
    expect(result1.token).toBeDefined();
    expect(result2.token).toBeDefined();
    expect(result1.token).not.toEqual(result2.token);

    // Verify tokens have different timestamps
    const tokenData1 = JSON.parse(atob(result1.token!));
    const tokenData2 = JSON.parse(atob(result2.token!));
    expect(tokenData1.timestamp).not.toEqual(tokenData2.timestamp);
  });
});
