import dayjs from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

export default function DatePickerForm({label, name, value, onChange, error, helperText, minDate}) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker 
        label={label}
        name={name}
        value={value ? dayjs(value) : null}
        onChange={(newValue) => onChange(name, newValue? newValue.format('YYYY-MM-DD') : '')}
        minDate={minDate ? dayjs(minDate) : null}
        slotProps={{
          textField: {
            error: error,
            helperText: helperText
          }
        }}
      />
    </LocalizationProvider>
  );
}
