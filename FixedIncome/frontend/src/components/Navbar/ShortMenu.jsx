import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import AnalyticsIcon from '@mui/icons-material/Analytics';

export default function ShortMenu() {
  return (
    <List
      sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}
      component="nav"
      aria-labelledby="nested-list-subheader"
    >
      <ListItemButton sx={{ display: 'flex', justifyContent:'center' }}>
        <ListItemIcon sx={{ display:'flex', justifyContent:'center' }}>
          <AnalyticsIcon />
        </ListItemIcon>
      </ListItemButton>
    </List>
  );
}
