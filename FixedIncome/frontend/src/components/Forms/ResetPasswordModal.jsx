import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { Alert } from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';

import AxiosInstance from '../Axios';
import { formatFieldErrors, getApiErrorMessage } from '../../utils/apiError';
import { API_ENDPOINTS } from '../../config/Api';

const fieldLabels = {
  password: 'Password',
  password_confirm: 'Confirm password',
};

const validationSchema = yup.object({
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .required('Required field'),
  password_confirm: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Required field'),
});

export default function ResetPasswordModal({ open, onClose, user, onSuccess }) {
  const [message, setMessage] = useState(null);
  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { password: '', password_confirm: '' },
    resolver: yupResolver(validationSchema),
  });

  const handleClose = () => {
    reset();
    setMessage(null);
    onClose?.();
  };

  const onSubmit = async (values) => {
    if (!user?.id) return;
    setMessage(null);
    try {
      await AxiosInstance.post(API_ENDPOINTS.USER_RESET_PASSWORD(user.id), {
        password: values.password,
      });
      reset();
      onSuccess?.();
      onClose?.();
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

  if (!user) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LockResetIcon />
        Reset password — {user.username}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {message}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 2,
              mt: 1,
            }}
          >
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="New password"
                  type="password"
                  fullWidth
                  error={Boolean(errors.password)}
                  helperText={errors.password?.message}
                />
              )}
            />
            <Controller
              name="password_confirm"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Confirm new password"
                  type="password"
                  fullWidth
                  error={Boolean(errors.password_confirm)}
                  helperText={errors.password_confirm?.message}
                />
              )}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)}>
          Update password
        </Button>
      </DialogActions>
    </Dialog>
  );
}
