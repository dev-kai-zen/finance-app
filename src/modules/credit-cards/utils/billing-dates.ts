export function toCalendarDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromCalendarDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function dateForBillingDay(
  year: number,
  monthIndex: number,
  billingDay: number,
): Date {
  return new Date(
    year,
    monthIndex,
    Math.min(billingDay, daysInMonth(year, monthIndex)),
  );
}

export function statementDateForTransaction(
  occurredAt: Date,
  statementDay: number,
): string {
  const currentCutoff = dateForBillingDay(
    occurredAt.getFullYear(),
    occurredAt.getMonth(),
    statementDay,
  );
  const transactionDay = new Date(
    occurredAt.getFullYear(),
    occurredAt.getMonth(),
    occurredAt.getDate(),
  );
  if (transactionDay.getTime() <= currentCutoff.getTime()) {
    return toCalendarDate(currentCutoff);
  }
  return toCalendarDate(
    dateForBillingDay(
      occurredAt.getFullYear(),
      occurredAt.getMonth() + 1,
      statementDay,
    ),
  );
}

export function addBillingMonths(
  statementOn: string,
  months: number,
  statementDay: number,
): string {
  const current = fromCalendarDate(statementOn);
  return toCalendarDate(
    dateForBillingDay(
      current.getFullYear(),
      current.getMonth() + months,
      statementDay,
    ),
  );
}

export function previousStatementDate(
  statementOn: string,
  statementDay: number,
): string {
  return addBillingMonths(statementOn, -1, statementDay);
}

export function nextDay(value: string): string {
  const date = fromCalendarDate(value);
  date.setDate(date.getDate() + 1);
  return toCalendarDate(date);
}

export function dueDateForStatement(
  statementOn: string,
  paymentDueDay: number,
): string {
  const statement = fromCalendarDate(statementOn);
  let due = dateForBillingDay(
    statement.getFullYear(),
    statement.getMonth(),
    paymentDueDay,
  );
  if (due.getTime() <= statement.getTime()) {
    due = dateForBillingDay(
      statement.getFullYear(),
      statement.getMonth() + 1,
      paymentDueDay,
    );
  }
  return toCalendarDate(due);
}

export function endOfMonth(value: Date): string {
  return toCalendarDate(new Date(value.getFullYear(), value.getMonth() + 1, 0));
}
