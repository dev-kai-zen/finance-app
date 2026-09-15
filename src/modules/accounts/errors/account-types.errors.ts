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

export class AccountTypeHasLinkedAccountsError extends Error {
  constructor(
    public readonly accountTypeId: string,
    public readonly linkedAccountsCount: number,
  ) {
    super(
      linkedAccountsCount === 1
        ? "This account group has 1 linked account. Reassign or remove it before deleting the group."
        : `This account group has ${linkedAccountsCount} linked accounts. Reassign or remove them before deleting the group.`,
    );
    this.name = "AccountTypeHasLinkedAccountsError";
  }
}
