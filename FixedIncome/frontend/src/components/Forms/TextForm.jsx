import TextField from '@mui/material/TextField';

export default function TextForm({label}) {
  return (
    <TextField 
      id="outlined-basic" 
      label={label} 
      variant="outlined" 
      sx={{width:'100%'}}
    />
  );
}
