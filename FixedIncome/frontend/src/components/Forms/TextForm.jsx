import TextField from '@mui/material/TextField';

export default function TextForm({label, name, value='', onChange=()=>{}, onBlur=()=>{}, error=false, helperText=''}) {
  return (
    <TextField 
      id="outlined-basic" 
      label={label} 
      variant="outlined" 
      sx={{width:'100%'}}
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      error={error}
      helperText={helperText}
    />
  );
}
