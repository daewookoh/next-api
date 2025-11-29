import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc/trpc";
import { hashPassword, verifyPassword, generateToken } from "@/lib/auth";
import { TRPCError } from "@trpc/server";

export const userRouter = router({
  // 사용자 회원가입
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("올바른 이메일 형식이 아닙니다"),
        password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "이미 존재하는 이메일입니다",
        });
      }

      const hashedPassword = await hashPassword(input.password);

      const user = await ctx.prisma.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          name: input.name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      const token = generateToken({ id: user.id, email: user.email, role: "user" });

      return { user, token };
    }),

  // 사용자 로그인
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "이메일 또는 비밀번호가 올바르지 않습니다",
        });
      }

      const isValid = await verifyPassword(input.password, user.password);

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "이메일 또는 비밀번호가 올바르지 않습니다",
        });
      }

      const token = generateToken({ id: user.id, email: user.email, role: "user" });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      };
    }),

  // 현재 사용자 정보 조회
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "사용자를 찾을 수 없습니다",
      });
    }

    return user;
  }),

  // 사용자 정보 수정
  update: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        password: z.string().min(6).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const data: { name?: string; password?: string } = {};

      if (input.name) data.name = input.name;
      if (input.password) data.password = await hashPassword(input.password);

      const user = await ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          updatedAt: true,
        },
      });

      return user;
    }),
});
