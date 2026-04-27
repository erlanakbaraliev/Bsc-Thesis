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
import PieChartIcon from '@mui/icons-material/PieChart';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import BusinessIcon from '@mui/icons-material/Business';
import { Link, useLocation } from 'react-router'
import { useAuth } from '../../hooks/useAuth';

export default function Menu() {
  const [open, setOpen] = React.useState(true);
  const [adminOpen, setAdminOpen] = React.useState(true);
  const { role } = useAuth();
  const canWriteReferenceData = role === 'ADMIN' || role === 'EDITOR';
  const isAdmin = role === 'ADMIN';

  const handleClick = () => {
    setOpen(!open);
  };

  const handleAdminClick = () => {
    setAdminOpen(!adminOpen);
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
        <List component="div" disablePadding>
          <ListItemButton sx={{ pl: 4 }} component={Link} to="/dashboard/" selected={path === "/dashboard/"}>
            <ListItemIcon>
              <PieChartIcon />
            </ListItemIcon>
            <ListItemText primary="Bond Dashboard" />
          </ListItemButton>
        </List>
        <List component="div" disablePadding>
          <ListItemButton sx={{ pl: 4 }} component={Link} to="/transactions/" selected={path === "/transactions/"}>
            <ListItemIcon>
              <SwapHorizIcon />
            </ListItemIcon>
            <ListItemText primary="Trades" />
          </ListItemButton>
        </List>
        <List component="div" disablePadding>
          <ListItemButton sx={{ pl: 4 }} component={Link} to="/issuers/" selected={path === "/issuers/"}>
            <ListItemIcon>
              <BusinessIcon />
            </ListItemIcon>
            <ListItemText primary="Issuers" />
          </ListItemButton>
        </List>
        {canWriteReferenceData && (
          <List component="div" disablePadding>
            <ListItemButton sx={{ pl: 4 }} component={Link} to="/create/bond/" selected={path === "/create/bond" || path === "/create/bond/"}>
              <ListItemIcon>
                <AddBoxIcon />
              </ListItemIcon>
              <ListItemText primary="Create Bond" />
            </ListItemButton>
          </List>
        )}

      </Collapse>

      {isAdmin && (
        <>
          <ListItemButton onClick={handleAdminClick}>
            <ListItemIcon>
              <AdminPanelSettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Admin" />
            {adminOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={adminOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItemButton sx={{ pl: 4 }} component={Link} to="/users/" selected={path === "/users/"}>
                <ListItemIcon>
                  <ManageAccountsIcon />
                </ListItemIcon>
                <ListItemText primary="User Management" />
              </ListItemButton>
            </List>
          </Collapse>
        </>
      )}
    </List>
  );
}
