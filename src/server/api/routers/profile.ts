import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  createTRPCContext,
} from "~/server/api/trpc";

export const profileRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input: { id }, ctx }) => {
      const currentUserId = ctx.session?.user.id;
      const profile = await ctx.prisma.user.findUnique({
        where: { id },
        select: {
          name: true,
          image: true,
          _count: { select: { follows: true, following: true, tweets: true } },
          follows:
            currentUserId == null
              ? undefined
              : { where: { id: currentUserId } },
        },
      });

      if (profile == null) return;

      return {
        name: profile.name,
        image: profile.image,
        followersCount: profile._count.follows,
        followingCount: profile._count.following,
        tweetsCount: profile._count.tweets,
        isFollowing: profile.follows.length > 0,
      };
    }),
  toggleFollow: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input: { userId }, ctx }) => {
      const currentUserId = ctx.session?.user.id;

      const existingFollow = await ctx.prisma.user.findFirst({
        where: { id: userId, follows: { some: { id: currentUserId } } },
      });

      let addedFollow: boolean
      if (existingFollow == null) {
        await ctx.prisma.user.update({
          where: { id: userId },
          data: { follows: { connect: { id: currentUserId } } },
        });
        addedFollow = true
      } else {
        await ctx.prisma.user.update({
          where: { id: userId },
          data: { follows: { connect: { id: currentUserId } } },
        });
        addedFollow = false
      }

      

      return { addedFollow };
    }),
});
