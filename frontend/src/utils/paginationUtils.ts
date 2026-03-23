type PaginatedItemsResult<T> = {
  items: T[];
  hasMore: boolean;
};

export const fetchAllPaginatedItems = async <T>(
  fetchPage: (offset: number, limit: number) => Promise<PaginatedItemsResult<T>>,
  pageSize: number = 100
): Promise<T[]> => {
  const allItems: T[] = [];
  let offset = 0;

  for (let pageCount = 0; pageCount < 500; pageCount += 1) {
    const page = await fetchPage(offset, pageSize);
    allItems.push(...page.items);

    if (!page.hasMore || page.items.length === 0) {
      break;
    }

    offset += pageSize;
  }

  return allItems;
};
