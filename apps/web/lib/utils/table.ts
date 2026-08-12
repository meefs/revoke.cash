import type { TokenAllowanceData } from '@revoke.cash/core/allowances';
import { deduplicateArray } from '@revoke.cash/core/utils';
import type { ColumnFiltersState, Table } from '@tanstack/react-table';

export const updateTableFilters = <T = TokenAllowanceData>(
  table: Table<T>,
  newFilters: ColumnFiltersState,
  ignoreIds: string[] = [],
) => {
  const oldFilters = table.getState().columnFilters;
  const keepOldFilters = oldFilters.filter((filter) => ignoreIds.includes(filter.id));
  const allFilters = [...keepOldFilters, ...newFilters];
  const uniqueFilters = deduplicateArray(allFilters, (filter) => filter.id);

  table.setColumnFilters(uniqueFilters);

  const filtersChanged = JSON.stringify(uniqueFilters) !== JSON.stringify(oldFilters);
  if (filtersChanged) table.resetPageIndex();
};
