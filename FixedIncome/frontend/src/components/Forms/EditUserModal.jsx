import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

import AxiosInstance from '../Axios';
import TextForm from './TextForm';
import SelectForm from './SelectForm';
import { formatFieldErrors, getApiErrorMessage } from '../../utils/apiError';
import { API_ENDPOINTS } from '../../config/Api';

const ROLE_OPTIONS = [
  { id: 'ADMIN', name: 'Admin' },
  { id: 'EDITOR', name: 'Editor' },
  { id: 'VIEWER', name: 'Viewer' },
];

const fieldLabels = {
  username: 'Username',
  email: 'Email',
  role: 'Role',
};

const validationSchema = yup.object({
  username: yup
    .string()
    .min(1, 'Username is required')
    .max(150, 'Username is too long')
    .required('Required field'),
  email: yup
    .string()
    .transform((v) => (v === '' ? undefined : v))
    .email('Invalid email')
    .optional(),
  role: yup.string().oneOf(['ADMIN', 'EDITOR', 'VIEWER']).required('Required field'),
});

export default function EditUserModal({ row, table, onSaved }) {
  const [message, setMessage] = useState(null);
  const user = row.original;
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: user.username,
      email: user.email || '',
      role: user.role,
    },
    resolver: yupResolver(validationSchema),
  });

  const onSubmit = async (values) => {
    setMessage(null);
    try {
      await AxiosInstance.patch(API_ENDPOINTS.USER_DETAIL(user.id), {
        username: values.username,
        email: values.email || '',
        role: values.role,
      });
      onSaved?.();
      table.setEditingRow(null);
    } catch (error) {
      const fieldErrors = formatFieldErrors(error.response?.data, fieldLabels);
      const fallback = getApiErrorMessage(error);
      setMessage(
        <Alert severity="error" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
          {fieldErrors || fallback}
        </Alert>,
      );
    }
  };

  return (
    <>
      <Box className="TopBar">
        <EditIcon />
        <Typography sx={{ marginLeft: '15px' }}>Edit user</Typography>
      </Box>
      <DialogContent>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: '24px',
            padding: '15px',
            boxShadow: 'rgba(100,100,111,0.2) 0px 7px 29px 0px',
          }}
        >
          {message && (
            <Box sx={{ gridColumn: { md: '1 / -1' } }}>{message}</Box>
          )}
          <Controller
            name="username"
            control={control}
            render={({ field }) => (
              <TextForm
                label="Username"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={Boolean(errors.username)}
                helperText={errors.username?.message}
              />
            )}
          />
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextForm
                label="Email"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
              />
            )}
          />
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <SelectForm
                label="Role"
                options={ROLE_OPTIONS}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={Boolean(errors.role)}
                helperText={errors.role?.message}
              />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => table.setEditingRow(null)}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)}>
          Save
        </Button>
      </DialogActions>
    </>
  );
}
