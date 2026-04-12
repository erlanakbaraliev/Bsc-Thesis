// ------------- Ordering ---------------
const fieldMap = {
  issuer_country: 'issuer__country',
  issuer_name: 'issuer__name',
  credit_rating: 'issuer__credit_rating',
  issuer_industry: 'issuer__industry',
}

export const getOrdering = (sorting) => {
  const ordering = sorting.length
                    ? sorting.map(s => (s.desc ? '-' : '') + (fieldMap[s.id] || s.id)).join(',')
                    : undefined;
  return ordering
}

// ------------- Filtering ---------------
const textFields = ['isin', 'issuer__country', 'issuer__name', 'bond_type', 'issuer__industry'];

export const getColumnFilters = (columnFilters) => {
  const filters = columnFilters.reduce((acc, col) => {
                    const columnName = fieldMap[col.id] || col.id;
                    if (textFields.includes(columnName)) {
                      acc[`${columnName}__icontains`] = col.value;
                    } else {
                      acc[`${columnName}`] = col.value;
                    }
                    return acc;
                  }, {});
  return filters
}
