import { describe, expect, it, vi } from "vitest";
import { createCatalogService } from "@/application/catalog/catalog-service";
import type { CatalogRepository } from "@/application/catalog/catalog-repository";
import { learningItemInputSchema } from "@/validation/catalog";

function repository(): CatalogRepository {
  return {
    listCategories: vi.fn(), getCategory: vi.fn(), getItem: vi.fn(), getLesson: vi.fn(), listActiveItemCandidates: vi.fn(),
    createCategory: vi.fn(), updateCategory: vi.fn(), deleteOrArchiveCategory: vi.fn(),
    createItem: vi.fn(), updateItem: vi.fn(), deleteOrArchiveItem: vi.fn(),
    createLesson: vi.fn(), updateLesson: vi.fn(), deleteOrArchiveLesson: vi.fn(),
    createTopic: vi.fn(), updateTopic: vi.fn(), deleteOrArchiveTopic: vi.fn(),
    addPrerequisite: vi.fn(), removePrerequisite: vi.fn(),
  };
}

describe("catalog application service", () => {
  it("creates a Main Topic from the fields shown in the quick-create form", async () => {
    const store = repository();
    vi.mocked(store.createItem).mockResolvedValue("new-item-id");
    const service = createCatalogService(store);
    const input = learningItemInputSchema.parse({
      categoryId: "d9428888-122b-4b36-9c22-4e1a6f0f9e2a",
      title: "Notes",
      description: "",
      status: "NOT_STARTED",
    });

    await expect(service.createItem(input)).resolves.toBe("new-item-id");
    expect(store.createItem).toHaveBeenCalledWith(expect.objectContaining({
      categoryId: "d9428888-122b-4b36-9c22-4e1a6f0f9e2a",
      title: "Notes",
      status: "NOT_STARTED",
      startedOn: null,
      completedOn: null,
      timeTakenMinutes: null,
    }));
  });

  it("persists a non-blocking prerequisite relationship", async () => {
    const store = repository();
    const service = createCatalogService(store);
    await service.addPrerequisite("item-a", "item-b");
    expect(store.addPrerequisite).toHaveBeenCalledWith("item-a", "item-b");
  });

  it("rejects only a self prerequisite without querying or gating progress", async () => {
    const store = repository();
    const service = createCatalogService(store);
    await expect(service.addPrerequisite("item-a", "item-a")).rejects.toThrow("An item cannot be its own prerequisite.");
    expect(store.addPrerequisite).not.toHaveBeenCalled();
    expect(store.updateItem).not.toHaveBeenCalled();
  });
});
