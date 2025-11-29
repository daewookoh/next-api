import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "../trpc/trpc";
import { TRPCError } from "@trpc/server";

export const productRouter = router({
  // 전체 상품 목록 조회 (공개)
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const cursor = input?.cursor;

      const products = await ctx.prisma.product.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          images: true,
          admin: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (products.length > limit) {
        const nextItem = products.pop();
        nextCursor = nextItem!.id;
      }

      return { products, nextCursor };
    }),

  // 상품 상세 조회 (공개)
  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.findUnique({
        where: { id: input.id },
        include: {
          images: true,
          admin: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "상품을 찾을 수 없습니다",
        });
      }

      return product;
    }),

  // 관리자 자신의 상품 목록 조회
  myProducts: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const cursor = input?.cursor;

      const products = await ctx.prisma.product.findMany({
        where: { adminId: ctx.user.id },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: { images: true },
      });

      let nextCursor: string | undefined;
      if (products.length > limit) {
        const nextItem = products.pop();
        nextCursor = nextItem!.id;
      }

      return { products, nextCursor };
    }),

  // 상품 생성 (관리자 전용)
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "상품명을 입력해주세요"),
        description: z.string().optional(),
        price: z.number().min(0, "가격은 0 이상이어야 합니다"),
        images: z.array(
          z.object({
            url: z.string().url(),
            publicId: z.string(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.create({
        data: {
          name: input.name,
          description: input.description,
          price: input.price,
          adminId: ctx.user.id,
          images: input.images
            ? {
                create: input.images,
              }
            : undefined,
        },
        include: { images: true },
      });

      return product;
    }),

  // 상품 수정 (관리자 전용)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        price: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 상품 소유권 확인
      const existingProduct = await ctx.prisma.product.findFirst({
        where: { id: input.id, adminId: ctx.user.id },
      });

      if (!existingProduct) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "상품을 찾을 수 없거나 수정 권한이 없습니다",
        });
      }

      const product = await ctx.prisma.product.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          price: input.price,
        },
        include: { images: true },
      });

      return product;
    }),

  // 상품 삭제 (관리자 전용)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 상품 소유권 확인
      const existingProduct = await ctx.prisma.product.findFirst({
        where: { id: input.id, adminId: ctx.user.id },
      });

      if (!existingProduct) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "상품을 찾을 수 없거나 삭제 권한이 없습니다",
        });
      }

      await ctx.prisma.product.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
