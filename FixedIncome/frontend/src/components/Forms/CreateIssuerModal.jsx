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
import AddBoxIcon from '@mui/icons-material/AddBox';
import { getData } from 'country-list';

import AxiosInstance from '../Axios';
import TextForm from './TextForm';
import SelectForm from './SelectForm';
import { formatFieldErrors, getApiErrorMessage } from '../../utils/apiError';
import { API_ENDPOINTS } from '../../config/Api';

const fieldLabels = {
  name: 'Name',
  country: 'Country',
  industry: 'Industry',
  credit_rating: 'Credit Rating',
};

const validationSchema = yup.object({
  name: yup
    .string()
    .min(2, 'Must be at least 2 chars')
    .max(255, 'Must be less than 255 chars')
    .required('Required field'),
  country: yup.string().required('Required field'),
  industry: yup.string().required('Required field'),
  credit_rating: yup.string().required('Required field'),
});

export default function CreateIssuerModal({ meta, onCancel, onSuccess }) {
  const [message, setMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      country: '',
      industry: '',
      credit_rating: '',
    },
    resolver: yupResolver(validationSchema),
  });

  const onSubmit = async (values) => {
    setMessage(null);
    setIsSubmitting(true);
    try {
      await AxiosInstance.post(API_ENDPOINTS.ISSUERS, values);
      onSuccess?.();
    } catch (error) {
      const fieldErrors = formatFieldErrors(error.response?.data, fieldLabels);
      const fallback = getApiErrorMessage(error);
      setMessage(
        <Alert severity="error" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
          {fieldErrors || fallback}
        </Alert>,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!meta) return null;

  return (
    <>
      <Box className="TopBar">
        <AddBoxIcon />
        <Typography sx={{ marginLeft: '15px' }}>Create issuer</Typography>
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
          {message ? (
            <Box sx={{ gridColumn: { md: '1 / -1' } }}>{message}</Box>
          ) : null}
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextForm
                label="Name"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
              />
            )}
          />
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <SelectForm
                label="Country"
                options={getData()}
                valueKey="code"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={Boolean(errors.country)}
                helperText={errors.country?.message}
              />
            )}
          />
          <Controller
            name="industry"
            control={control}
            render={({ field }) => (
              <SelectForm
                label="Industry"
                options={meta.industries}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={Boolean(errors.industry)}
                helperText={errors.industry?.message}
              />
            )}
          />
          <Controller
            name="credit_rating"
            control={control}
            render={({ field }) => (
              <SelectForm
                label="Credit Rating"
                options={meta.credit_ratings}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={Boolean(errors.credit_rating)}
                helperText={errors.credit_rating?.message}
              />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Create'}
        </Button>
      </DialogActions>
    </>
  );
}
