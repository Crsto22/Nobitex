const fallbackPageSize = 12;

export const defaultPageSize = getPositiveInteger(
  process.env.NEXT_PUBLIC_PAGINATION_DEFAULT_LIMIT,
  fallbackPageSize
);

function getPositiveInteger(value: string | undefined, fallback: number) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}
