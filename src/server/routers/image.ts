import { z } from "zod";
import { router, adminProcedure } from "../trpc/trpc";
import { TRPCError } from "@trpc/server";

export const imageRouter = router({
  // 상품에 이미지 추가
  add: adminProcedure
    .input(
      z.object({
        productId: z.string(),
        url: z.string().url(),
        publicId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 상품 소유권 확인
      const product = await ctx.prisma.product.findFirst({
        where: { id: input.productId, adminId: ctx.user.id },
      });

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "상품을 찾을 수 없거나 이미지 추가 권한이 없습니다",
        });
      }

      const image = await ctx.prisma.image.create({
        data: {
          url: input.url,
          publicId: input.publicId,
          productId: input.productId,
        },
      });

      return image;
    }),

  // 이미지 삭제
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 이미지와 관련 상품 조회
      const image = await ctx.prisma.image.findUnique({
        where: { id: input.id },
        include: { product: true },
      });

      if (!image) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "이미지를 찾을 수 없습니다",
        });
      }

      // 상품 소유권 확인
      if (image.product.adminId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "이미지 삭제 권한이 없습니다",
        });
      }

      await ctx.prisma.image.delete({
        where: { id: input.id },
      });

      return { success: true, publicId: image.publicId };
    }),

  // 상품의 이미지 목록 조회
  byProductId: adminProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const images = await ctx.prisma.image.findMany({
        where: { productId: input.productId },
        orderBy: { createdAt: "asc" },
      });

      return images;
    }),
});
