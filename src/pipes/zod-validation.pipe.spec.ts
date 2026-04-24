import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "./zod-validation.pipe";

describe("ZodValidationPipe", () => {
  const schema = z.object({
    email: z.string().email(),
    age: z.number().int().min(18),
  });

  it("returns parsed data when validation succeeds", () => {
    const pipe = new ZodValidationPipe(schema);
    const value = {
      email: "dev@example.com",
      age: 21,
    };

    expect(pipe.transform(value)).toEqual(value);
  });

  it("throws BadRequestException with zod issues when validation fails", () => {
    const pipe = new ZodValidationPipe(schema);

    expect(() =>
      pipe.transform({
        email: "not-an-email",
        age: 15,
      })
    ).toThrow(BadRequestException);
  });
});
