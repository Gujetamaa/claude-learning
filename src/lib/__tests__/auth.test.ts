import { test, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    mockCookieSet: vi.fn(),
    mockCookieGet: vi.fn(),
    mockCookieDelete: vi.fn(),
  };
});

// Mock server-only first (before importing auth)
vi.mock("server-only", () => ({}));

// Mock jose
vi.mock("jose", () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue("mock-jwt-token"),
  })),
  jwtVerify: vi
    .fn()
    .mockResolvedValue({
      payload: {
        userId: "test-user-id",
        email: "test@example.com",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    }),
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: mocks.mockCookieSet,
    get: mocks.mockCookieGet,
    delete: mocks.mockCookieDelete,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "development");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test("createSession creates token with correct payload", async () => {
  const { createSession } = await import("../auth");
  const { SignJWT } = await import("jose");
  const mockSignJWT = vi.mocked(SignJWT);

  await createSession("user-123", "user@example.com");

  // Verify SignJWT was called with session payload
  expect(mockSignJWT).toHaveBeenCalledWith({
    userId: "user-123",
    email: "user@example.com",
    expiresAt: expect.any(Date),
  });
});

test("createSession sets correct JWT header", async () => {
  const { createSession } = await import("../auth");
  const { SignJWT } = await import("jose");
  const mockInstance = vi.mocked(SignJWT)();

  await createSession("user-123", "user@example.com");

  expect(mockInstance.setProtectedHeader).toHaveBeenCalledWith({
    alg: "HS256",
  });
});

test("createSession sets 7-day expiration", async () => {
  const { createSession } = await import("../auth");
  const { SignJWT } = await import("jose");
  const mockInstance = vi.mocked(SignJWT)();

  await createSession("user-123", "user@example.com");

  expect(mockInstance.setExpirationTime).toHaveBeenCalledWith("7d");
});

test("createSession sets issued at time", async () => {
  const { createSession } = await import("../auth");
  const { SignJWT } = await import("jose");
  const mockInstance = vi.mocked(SignJWT)();

  await createSession("user-123", "user@example.com");

  expect(mockInstance.setIssuedAt).toHaveBeenCalled();
});

test("createSession sets HTTPOnly cookie in development", async () => {
  const { createSession } = await import("../auth");
  vi.stubEnv("NODE_ENV", "development");

  await createSession("user-123", "user@example.com");

  expect(mocks.mockCookieSet).toHaveBeenCalledWith(
    "auth-token",
    "mock-jwt-token",
    expect.objectContaining({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    })
  );
});

test("createSession sets secure cookie in production", async () => {
  const { createSession } = await import("../auth");
  vi.stubEnv("NODE_ENV", "production");

  await createSession("user-123", "user@example.com");

  expect(mocks.mockCookieSet).toHaveBeenCalledWith(
    "auth-token",
    "mock-jwt-token",
    expect.objectContaining({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    })
  );
});

test("createSession sets expiration date 7 days from now", async () => {
  const { createSession } = await import("../auth");

  const beforeTime = Date.now();
  await createSession("user-123", "user@example.com");
  const afterTime = Date.now();

  const callArgs = mocks.mockCookieSet.mock.calls[0][2];
  const expiresAt = callArgs.expires as Date;

  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  const expectedMinTime = beforeTime + sevenDaysInMs - 1000; // Allow 1s buffer
  const expectedMaxTime = afterTime + sevenDaysInMs + 1000; // Allow 1s buffer

  expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinTime);
  expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxTime);
});

test("getSession returns null when no token exists", async () => {
  const { getSession } = await import("../auth");
  mocks.mockCookieGet.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns session when valid token exists", async () => {
  const { getSession } = await import("../auth");
  const mockToken = "valid-token";
  mocks.mockCookieGet.mockReturnValue({ value: mockToken });

  const session = await getSession();

  expect(session).toBeDefined();
  expect(session?.userId).toBe("test-user-id");
  expect(session?.email).toBe("test@example.com");
});

test("getSession returns null on JWT verification error", async () => {
  const { getSession } = await import("../auth");
  const { jwtVerify } = await import("jose");
  vi.mocked(jwtVerify).mockRejectedValueOnce(new Error("Invalid token"));

  mocks.mockCookieGet.mockReturnValue({ value: "invalid-token" });

  const session = await getSession();

  expect(session).toBeNull();
});

test("deleteSession removes auth cookie", async () => {
  const { deleteSession } = await import("../auth");

  await deleteSession();

  expect(mocks.mockCookieDelete).toHaveBeenCalledWith("auth-token");
});

test("verifySession returns null when no token in request", async () => {
  const { verifySession } = await import("../auth");

  const mockRequest = {
    cookies: {
      get: vi.fn().mockReturnValue(undefined),
    },
  };

  const session = await verifySession(mockRequest as any);

  expect(session).toBeNull();
});

test("verifySession returns session when valid token in request", async () => {
  const { verifySession } = await import("../auth");

  const mockRequest = {
    cookies: {
      get: vi.fn().mockReturnValue({ value: "valid-token" }),
    },
  };

  const session = await verifySession(mockRequest as any);

  expect(session).toBeDefined();
  expect(session?.userId).toBe("test-user-id");
  expect(session?.email).toBe("test@example.com");
});

test("verifySession returns null on JWT verification error", async () => {
  const { verifySession } = await import("../auth");
  const { jwtVerify } = await import("jose");
  vi.mocked(jwtVerify).mockRejectedValueOnce(new Error("Invalid token"));

  const mockRequest = {
    cookies: {
      get: vi.fn().mockReturnValue({ value: "invalid-token" }),
    },
  };

  const session = await verifySession(mockRequest as any);

  expect(session).toBeNull();
});
