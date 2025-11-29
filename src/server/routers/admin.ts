import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "../trpc/trpc";
import { hashPassword, verifyPassword, generateToken } from "@/lib/auth";
import { TRPCError } from "@trpc/server";

export const adminRouter = router({
  // 관리자 회원가입
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("올바른 이메일 형식이 아닙니다"),
        password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingAdmin = await ctx.prisma.admin.findUnique({
        where: { email: input.email },
      });

      if (existingAdmin) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "이미 존재하는 이메일입니다",
        });
      }

      const hashedPassword = await hashPassword(input.password);

      const admin = await ctx.prisma.admin.create({
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

      const token = generateToken({ id: admin.id, email: admin.email, role: "admin" });

      return { admin, token };
    }),

  // 관리자 로그인
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const admin = await ctx.prisma.admin.findUnique({
        where: { email: input.email },
      });

      if (!admin) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "이메일 또는 비밀번호가 올바르지 않습니다",
        });
      }

      const isValid = await verifyPassword(input.password, admin.password);

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "이메일 또는 비밀번호가 올바르지 않습니다",
        });
      }

      const token = generateToken({ id: admin.id, email: admin.email, role: "admin" });

      return {
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        },
        token,
      };
    }),

  // 현재 관리자 정보 조회
  me: adminProcedure.query(async ({ ctx }) => {
    const admin = await ctx.prisma.admin.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "관리자를 찾을 수 없습니다",
      });
    }

    return admin;
  }),

  // 관리자 정보 수정
  update: adminProcedure
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

      const admin = await ctx.prisma.admin.update({
        where: { id: ctx.user.id },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          updatedAt: true,
        },
      });

      return admin;
    }),
});
