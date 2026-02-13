import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-physician",
    email: "physician@test.com",
    name: "Test Physician",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("patients.stats", () => {
  it("returns patient statistics", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.patients.stats();

    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("active");
    expect(result).toHaveProperty("inactive");
    expect(typeof result.total).toBe("number");
    expect(typeof result.active).toBe("number");
    expect(typeof result.inactive).toBe("number");
  });
});

describe("patients.list", () => {
  it("returns list of patients", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.patients.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("filters by physician ID when provided", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.patients.list({ physicianId: 1 });

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("patients.create", () => {
  it("creates a new patient successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const newPatient = {
      mrn: `TEST-${Date.now()}`,
      firstName: "Test",
      lastName: "Patient",
      dateOfBirth: new Date("1980-01-01"),
      gender: "male" as const,
      email: "test@example.com",
      phone: "555-0123",
      allergies: ["None"],
      chronicConditions: [],
      currentMedications: [],
    };

    const result = await caller.patients.create(newPatient);

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("success", true);
    expect(typeof result.id).toBe("number");
  });
});
