import { prerequisiteIsValid } from "@/domain/catalog";
import type { CatalogRepository } from "./catalog-repository";
import type { CategoryInput, LearningItemInput, LessonInput, TopicInput } from "@/validation/catalog";
import { CatalogError } from "./catalog-errors";

export function createCatalogService(repository: CatalogRepository) {
  return {
    listCategories: () => repository.listCategories(),
    getCategory: (id: string) => repository.getCategory(id),
    getItem: (id: string) => repository.getItem(id),
    getLesson: (id: string) => repository.getLesson(id),
    listActiveItemCandidates: (exceptId?: string) => repository.listActiveItemCandidates(exceptId),
    createCategory: (input: CategoryInput) => repository.createCategory(input),
    updateCategory: (id: string, input: CategoryInput) => repository.updateCategory(id, input),
    deleteCategory: (id: string) => repository.deleteOrArchiveCategory(id),
    createItem: (input: LearningItemInput) => repository.createItem(input),
    updateItem: (id: string, input: LearningItemInput) => repository.updateItem(id, input),
    deleteItem: (id: string) => repository.deleteOrArchiveItem(id),
    createLesson: (input: LessonInput) => repository.createLesson(input),
    updateLesson: (id: string, input: LessonInput) => repository.updateLesson(id, input),
    deleteLesson: (id: string) => repository.deleteOrArchiveLesson(id),
    createTopic: (input: TopicInput) => repository.createTopic(input),
    updateTopic: (id: string, input: TopicInput) => repository.updateTopic(id, input),
    deleteTopic: (id: string) => repository.deleteOrArchiveTopic(id),
    async addPrerequisite(learningItemId: string, prerequisiteItemId: string) {
      if (!prerequisiteIsValid(learningItemId, prerequisiteItemId)) {
        throw new CatalogError("INVALID_REFERENCE", "An item cannot be its own prerequisite.");
      }
      await repository.addPrerequisite(learningItemId, prerequisiteItemId);
    },
    removePrerequisite: (learningItemId: string, prerequisiteItemId: string) => repository.removePrerequisite(learningItemId, prerequisiteItemId),
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
