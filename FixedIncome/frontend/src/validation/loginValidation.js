import * as yup from 'yup'

export const loginValidationSchema = yup.object({
  username: yup
          .string()
          .trim()
          .required("Required field")
          .min(3, "Username must be at least 3 characters")
          .max(50, "Username is too long"),
  password: yup
          .string()
          .required("Required field")
          .min(5, "Password must be at least 5 characters"),
})


