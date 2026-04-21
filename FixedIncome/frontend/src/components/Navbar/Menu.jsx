import * as React from 'react';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TableViewIcon from '@mui/icons-material/TableView';
import AddBoxIcon from '@mui/icons-material/AddBox';
import { Link, useLocation } from 'react-router'
import { useAuth } from '../../hooks/useAuth';

export default function Menu() {
  const [open, setOpen] = React.useState(true);
  const { role } = useAuth();
  const canWriteReferenceData = role === 'ADMIN' || role === 'EDITOR';

  const handleClick = () => {
    setOpen(!open);
  };

  const location = useLocation()
  const path = location.pathname

  return (
    <List
      sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}
      component="nav"
      aria-labelledby="nested-list-subheader"
    >
      <ListItemButton onClick={handleClick}>
        <ListItemIcon>
          <AnalyticsIcon />
        </ListItemIcon>
        <ListItemText primary="Data" />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          <ListItemButton sx={{ pl: 4 }} component={Link} to="/" selected={path === "/"}>
            <ListItemIcon>
              <TableViewIcon />
            </ListItemIcon>
            <ListItemText primary="Table View" />
          </ListItemButton>
        </List>
        {canWriteReferenceData && (
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} component={Link} to="/create/issuer" selected={path === "/create/issuer"}>
              <ListItemIcon>
                <AddBoxIcon />
              </ListItemIcon>
              <ListItemText primary="Create Issuer" />
            </ListItemButton>
          </List>
        )}
        {canWriteReferenceData && (
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} component={Link} to="/create/bond" selected={path === "/create/bond"}>
              <ListItemIcon>
                <AddBoxIcon />
              </ListItemIcon>
              <ListItemText primary="Create Bond" />
            </ListItemButton>
          </List>
        )}

      </Collapse>
    </List>
  );
}
