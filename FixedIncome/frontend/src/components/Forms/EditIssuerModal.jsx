import { useEffect, useState } from 'react';
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

export default function EditIssuerModal({ issuer, meta, onCancel, onSuccess }) {
  const [message, setMessage] = useState(null);

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
  });

  useEffect(() => {
    if (issuer) {
      reset({
        name: issuer.name,
        country: issuer.country,
        industry: issuer.industry,
        credit_rating: issuer.credit_rating,
      });
    }
  }, [issuer, reset]);

  const onSubmit = async (values) => {
    if (!issuer?.id) return;
    setMessage(null);
    try {
      await AxiosInstance.patch(API_ENDPOINTS.ISSUER_DETAIL(issuer.id), values);
      onSuccess?.();
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

  if (!issuer || !meta) return null;

  return (
    <>
      <Box className="TopBar">
        <EditIcon />
        <Typography sx={{ marginLeft: '15px' }}>Edit issuer</Typography>
      </Box>
      <DialogContent>
        {message}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
            pt: 1,
          }}
        >
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
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)}>
          Save changes
        </Button>
      </DialogActions>
    </>
  );
}
