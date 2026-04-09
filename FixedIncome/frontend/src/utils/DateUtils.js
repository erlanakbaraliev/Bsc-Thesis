import dayjs from "dayjs"

export const formatDateParam = (date) => {
  return date? dayjs(date).format('YYYY-MM-DD') : undefined
}
