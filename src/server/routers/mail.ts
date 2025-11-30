import { z } from "zod";
import nodemailer from "nodemailer";
import { router, publicProcedure } from "../trpc/trpc";
import { TRPCError } from "@trpc/server";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const mailRouter = router({
  send: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "이름을 입력해주세요"),
        email: z.string().email("올바른 이메일을 입력해주세요"),
        subject: z.string().min(1, "제목을 입력해주세요"),
        message: z.string().min(1, "내용을 입력해주세요"),
      })
    )
    .mutation(async ({ input }) => {
      const { name, email, subject, message } = input;

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: process.env.GMAIL_TO,
        subject: `[문의] ${subject}`,
        html: `
          <h2>새로운 문의가 도착했습니다</h2>
          <p><strong>이름:</strong> ${name}</p>
          <p><strong>이메일:</strong> ${email}</p>
          <p><strong>제목:</strong> ${subject}</p>
          <hr />
          <p><strong>내용:</strong></p>
          <p>${message.replace(/\n/g, "<br />")}</p>
        `,
        replyTo: email,
      };

      try {
        await transporter.sendMail(mailOptions);
        return { success: true, message: "메일이 성공적으로 전송되었습니다" };
      } catch (error) {
        console.error("메일 전송 오류:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "메일 전송에 실패했습니다",
        });
      }
    }),
});
