import { router } from "../trpc/trpc";
import { adminRouter } from "./admin";
import { userRouter } from "./user";
import { productRouter } from "./product";
import { imageRouter } from "./image";
import { mailRouter } from "./mail";

export const appRouter = router({
  admin: adminRouter,
  user: userRouter,
  product: productRouter,
  image: imageRouter,
  mail: mailRouter,
});

export type AppRouter = typeof appRouter;
