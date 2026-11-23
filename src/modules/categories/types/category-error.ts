export type CategoryErrorCode =
  | "notFound"
  | "duplicateName"
  | "systemType"
  | "selfParent"
  | "parentNotFound"
  | "parentNotGroup"
  | "parentType"
  | "groupHasChildren"
  | "groupTypeHasChildren"
  | "systemParent"
  | "protectedDelete"
  | "deleteHasChildren";

export class CategoryError extends Error {
  constructor(
    public readonly code: CategoryErrorCode,
    message: string,
    public readonly details: Record<string, string | number> = {},
  ) {
    super(message);
    this.name = "CategoryError";
  }
}
