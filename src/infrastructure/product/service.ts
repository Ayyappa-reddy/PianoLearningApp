import "server-only";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import * as planning from "./planning-repository";
import * as activity from "./activity-repository";
import * as reviews from "./review-repository";
import * as progress from "./progress-repository";
import * as login from "./login-repository";
import * as dataExport from "./export-repository";
import { getOrCreateOwnerProfile, updateOwnerTimezone } from "./profile-repository";

export const productService = {
  prisma: getPrismaClient(), planning, activity, reviews, progress, login, dataExport,
  getOrCreateOwnerProfile, updateOwnerTimezone,
};
