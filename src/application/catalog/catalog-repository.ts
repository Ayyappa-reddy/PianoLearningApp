import type { CategoryInput, LearningItemInput, LessonInput, TopicInput } from "@/validation/catalog";

export type CatalogCategory = { id: string; name: string; description: string | null; archivedAt: Date | null };
export type CatalogItem = {
  id: string; categoryId: string; title: string; description: string | null; notes: string | null;
  status: string; startedOn: Date | null; completedOn: Date | null; timeTakenMinutes: number | null;
  archivedAt: Date | null; category?: CatalogCategory;
};
export type CatalogTopic = {
  id: string; lessonId: string; title: string; description: string | null; notes: string | null; sortOrder: number;
  status: string; startedOn: Date | null; completedOn: Date | null; timeTakenMinutes: number | null; archivedAt: Date | null;
};
export type CatalogLesson = {
  id: string; learningItemId: string; title: string; description: string | null; notes: string | null;
  status: string; startedOn: Date | null; completedOn: Date | null; timeTakenMinutes: number | null;
  archivedAt: Date | null; topics: CatalogTopic[];
};
export type CatalogItemDetail = CatalogItem & {
  category: CatalogCategory;
  lessons: CatalogLesson[];
  prerequisites: Array<{ prerequisiteItem: { id: string; title: string; archivedAt: Date | null } }>;
  prerequisiteFor: Array<{ learningItem: { id: string; title: string; archivedAt: Date | null } }>;
};
export type CatalogCategoryDetail = CatalogCategory & { learningItems: CatalogItem[] };
export type CatalogLessonDetail = CatalogLesson & { learningItem: { id: string; title: string; archivedAt: Date | null; category: CatalogCategory } };

export interface CatalogRepository {
  listCategories(): Promise<CatalogCategoryDetail[]>;
  getCategory(id: string): Promise<CatalogCategoryDetail | null>;
  getItem(id: string): Promise<CatalogItemDetail | null>;
  getLesson(id: string): Promise<CatalogLessonDetail | null>;
  listActiveItemCandidates(exceptId?: string): Promise<Array<{ id: string; title: string; categoryName: string }>>;
  createCategory(input: CategoryInput): Promise<string>;
  updateCategory(id: string, input: CategoryInput): Promise<void>;
  deleteOrArchiveCategory(id: string): Promise<"deleted" | "archived">;
  createItem(input: LearningItemInput): Promise<string>;
  updateItem(id: string, input: LearningItemInput): Promise<void>;
  deleteOrArchiveItem(id: string): Promise<"deleted" | "archived">;
  createLesson(input: LessonInput): Promise<string>;
  updateLesson(id: string, input: LessonInput): Promise<void>;
  deleteOrArchiveLesson(id: string): Promise<"deleted" | "archived">;
  createTopic(input: TopicInput): Promise<void>;
  updateTopic(id: string, input: TopicInput): Promise<void>;
  deleteOrArchiveTopic(id: string): Promise<"deleted" | "archived">;
  addPrerequisite(learningItemId: string, prerequisiteItemId: string): Promise<void>;
  removePrerequisite(learningItemId: string, prerequisiteItemId: string): Promise<void>;
}
