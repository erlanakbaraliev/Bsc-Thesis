import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Box, Paper, Typography, TextField, Alert, CircularProgress, Button } from "@mui/material";
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useForm, Controller } from "react-hook-form"
import { yupResolver } from '@hookform/resolvers/yup';
import { loginValidationSchema } from '../validation/loginValidation';
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const [backendError, setBackendError] = useState('');
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
    setBackendError('');
    try {
      await login(data.username, data.password)
      navigate('/')
    } catch {
      setBackendError('Invalid username or password')
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '89vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor:'grey.100' }}>
      <Paper elevation={3} sx={{ p:4, width: '100%', maxWidth: 400, borderRadius: 3 }}>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb:3 }}>
          <Box sx={{ bgcolor: 'primary.main', borderRadius: '50%', p:1.5, mb:1.5 }}>
            <LockOutlinedIcon sx={{ color: 'white' }} />
          </Box>
          <Typography variant="h5" fontWeight={600}>Sign in</Typography>
          <Typography variant="body2" color="text.secondary">Fixed Income Dashboard</Typography>
        </Box>

        {backendError && <Alert severity="error" sx={{ mb:2 }}>{backendError}</Alert>}

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
