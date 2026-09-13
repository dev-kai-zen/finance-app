export class AccountTypeNotFoundError extends Error {
  constructor(public readonly accountTypeId: string) {
    super(`Account type with id "${accountTypeId}" was not found.`);
    this.name = "AccountTypeNotFoundError";
  }
}

export class SystemAccountTypeDeletionError extends Error {
  constructor(public readonly accountTypeId: string) {
    super(`System account type "${accountTypeId}" cannot be deleted.`);
    this.name = "SystemAccountTypeDeletionError";
  }
}
