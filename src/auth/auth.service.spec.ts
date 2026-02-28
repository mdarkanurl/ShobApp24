import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "@thallesp/nestjs-better-auth";
import { PrismaService } from "../prisma/prisma.service";
import { AuthServiceLocal } from "./auth.service";

jest.mock("@thallesp/nestjs-better-auth", () => ({
  AuthService: class AuthService {},
}));

type BetterAuthApiMock = {
  signUpEmail: jest.Mock;
  getSession: jest.Mock;
  signInEmail: jest.Mock;
};

describe("AuthServiceLocal", () => {
  let service: AuthServiceLocal;
  let authApiMock: BetterAuthApiMock;

  beforeEach(async () => {
    authApiMock = {
      signUpEmail: jest.fn(),
      getSession: jest.fn(),
      signInEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthServiceLocal,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: AuthService,
          useValue: {
            api: authApiMock,
          },
        },
      ],
    }).compile();

    service = module.get<AuthServiceLocal>(AuthServiceLocal);
  });

  it("throws ConflictException when signUpEmail returns 422", async () => {
    authApiMock.signUpEmail.mockResolvedValue({ status: 422 });

    await expect(
      service.signUp({
        email: "test@example.com",
        name: "Test User",
        password: "password123",
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("throws BadRequestException when login returns 401", async () => {
    authApiMock.signInEmail.mockResolvedValue({
      status: 401,
      headers: { get: jest.fn() },
    });

    await expect(
      service.login(
        {
          email: "test@example.com",
          password: "password123",
        },
        { headers: {} } as any
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws NotFoundException when getSession returns null", async () => {
    authApiMock.getSession.mockResolvedValue(null);

    await expect(service.getSession({})).rejects.toBeInstanceOf(NotFoundException);
  });
});
