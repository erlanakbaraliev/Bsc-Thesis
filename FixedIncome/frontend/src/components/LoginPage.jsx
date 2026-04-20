import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, Paper, Typography, TextField, Alert, CircularProgress, Button } from "@mui/material";
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useForm, Controller } from "react-hook-form"
import { yupResolver } from '@hookform/resolvers/yup';
import { loginValidationSchema } from '../validation/loginValidation';
import { useAuth } from '../hooks/useAuth'
import { getApiErrorMessage } from '../utils/apiError';

export default function LoginPage() {
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const { control, handleSubmit, formState: {errors} } = useForm({
    defaultValues: {
      username: "",
      password: ""
    },
    resolver: yupResolver(loginValidationSchema)
  });
  const onSubmit = async(data) => {
    setLoading(true);
    try {
      await login(data.username, data.password)
      navigate('/')
    } catch(error) {
      const status = error?.response?.status

      const errorMessage = (status === 401 || status === 400)
        ? "Invalid username or password."
        : getApiErrorMessage(error)

      setMessage(
          <Alert severity="error" sx={{ mt: 2, whiteSpace: 'pre-line' }}>{errorMessage}</Alert>
      )
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '89vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor:'background.default' }}>
      <Paper elevation={3} sx={{ p:4, width: '100%', maxWidth: 400, borderRadius: 3, bgcolor: 'background.paper' }}>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb:3 }}>
          <Box sx={{ bgcolor: 'primary.main', borderRadius: '50%', p:1.5, mb:1.5 }}>
            <LockOutlinedIcon sx={{ color: 'white' }} />
          </Box>
          <Typography variant="h5" fontWeight={600}>Sign in</Typography>
          <Typography variant="body2" color="text.secondary">Fixed Income Dashboard</Typography>
        </Box>

        {message && (
          <Box sx={{ gridColumn: { md: '1/-1' }, mb: '15px' }}>
            {message}
          </Box>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name="username"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Username"
                fullWidth
                size="small"
                sx={{ mb:2 }}
                error={Boolean(errors.username)}
                helperText={errors.username?.message}
              />
            )}
          />
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Password"
                type="password"
                fullWidth
                size="small"
                sx={{ mb:2 }}
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
              />
            )}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
          >
            {loading ? <CircularProgress size={22} color='inherit'/> : 'Sign in'}
          </Button>
        </form>

      </Paper>
    </Box>
  )
}
