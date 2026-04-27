import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { Alert, MenuItem, TextField } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

import AxiosInstance from '../Axios';
import { formatFieldErrors, getApiErrorMessage } from '../../utils/apiError';
import { API_ENDPOINTS } from '../../config/Api';

const fieldLabels = {
  bond: 'Bond',
  action: 'Action',
  quantity: 'Quantity',
  price: 'Price',
};

const validationSchema = yup.object({
  bond: yup
    .number()
    .transform((value, orig) =>
      orig === '' || orig === null || orig === undefined || Number.isNaN(value)
        ? undefined
        : value,
    )
    .integer()
    .positive('Select a bond')
    .required('Required field'),
  action: yup.string().oneOf(['BUY', 'SELL']).required('Required field'),
  quantity: yup
    .number()
    .integer()
    .min(1, 'At least 1')
    .required('Required field'),
  price: yup
    .number()
    .transform((value, orig) =>
      orig === '' || orig === null || orig === undefined || Number.isNaN(value)
        ? undefined
        : value,
    )
    .positive('Must be positive')
    .required('Required field'),
});

export default function CreateTransactionModal({ onCancel, onSuccess }) {
  const [message, setMessage] = useState(null);
  const [bonds, setBonds] = useState([]);
  const [bondsError, setBondsError] = useState('');

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      bond: null,
      action: 'BUY',
      quantity: 1,
      price: '',
    },
    resolver: yupResolver(validationSchema),
  });

  useEffect(() => {
    let mounted = true;
    AxiosInstance.get('bonds/', { params: { page_size: 1000 } })
      .then((res) => {
        if (!mounted) return;
        const list = res.data?.results ?? res.data ?? [];
        setBonds(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (mounted) setBondsError('Could not load bonds.');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const onSubmit = async (values) => {
    setMessage(null);
    try {
      await AxiosInstance.post(API_ENDPOINTS.TRANSACTIONS, {
        bond: values.bond,
        action: values.action,
        quantity: values.quantity,
        price: String(values.price),
      });
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

  return (
    <>
      <Box className="TopBar">
        <SwapHorizIcon />
        <Typography sx={{ marginLeft: '15px' }}>Record trade</Typography>
      </Box>
      <DialogContent>
        {bondsError ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {bondsError}
          </Alert>
        ) : null}
        {message}
        <Box
          component="form"
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
          onSubmit={handleSubmit(onSubmit)}
        >
          <Controller
            name="bond"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Bond"
                fullWidth
                error={Boolean(errors.bond)}
                helperText={errors.bond?.message}
                value={field.value ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  field.onChange(v === '' ? null : Number(v));
                }}
              >
                <MenuItem value="">
                  <em>Select bond</em>
                </MenuItem>
                {bonds.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.isin}
                    {b.issuer_name ? ` — ${b.issuer_name}` : ''}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="action"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Action"
                fullWidth
                error={Boolean(errors.action)}
                helperText={errors.action?.message}
              >
                <MenuItem value="BUY">Buy</MenuItem>
                <MenuItem value="SELL">Sell</MenuItem>
              </TextField>
            )}
          />
          <Controller
            name="quantity"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Quantity (units)"
                fullWidth
                inputProps={{ min: 1, step: 1 }}
                error={Boolean(errors.quantity)}
                helperText={errors.quantity?.message}
              />
            )}
          />
          <Controller
            name="price"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Price per unit"
                fullWidth
                inputProps={{ min: 0.01, step: 'any' }}
                error={Boolean(errors.price)}
                helperText={errors.price?.message}
              />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)}>
          Save trade
        </Button>
      </DialogActions>
    </>
  );
}
