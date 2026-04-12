import dayjs from "dayjs"

export const formatDateParam = (date) => {
  return date? dayjs(date).format('YYYY-MM-DD') : undefined
}

export const formatDateTimeParam = (datetime) => {
  return datetime? dayjs(datetime).format('YYYY-MM-DD HH:mm') : undefined
}

export const formatDateTimeParamAPICall = (datetime) => {
  return datetime? dayjs(datetime).format('YYYY-MM-DDTHH:mm') : undefined
}
