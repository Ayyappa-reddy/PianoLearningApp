import "server-only";
import { createCatalogService } from "@/application/catalog/catalog-service";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { createPrismaCatalogRepository } from "./prisma-catalog-repository";

export function getCatalogService() {
  return createCatalogService(createPrismaCatalogRepository(getPrismaClient()));
}
