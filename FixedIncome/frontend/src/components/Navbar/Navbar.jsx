import { React, useState } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import CssBaseline from '@mui/material/CssBaseline';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { IconButton, Avatar, MenuItem, Menu as MuiMenu, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';

import Menu from './Menu';
import ShortMenu from './ShortMenu';
import logo from '../../assets/money.png';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router';

const drawerWidth = 240;
const shortDrawerWidth = 80

export default function Navbar({content}) {
  const [isBigMenu, setIsBigMenu] = useState(true)

  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const handleAvatarClick = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const changeMenu = () => {
    setIsBigMenu(!isBigMenu)
  }

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton sx={{marginRight:'40px'}} onClick={changeMenu}>
            {isBigMenu? <MenuOpenIcon/>: <MenuIcon/>}
          </IconButton>
          <img src={logo} width="3%"/>
          <Typography variant='h6' noWrap component="div" sx={{ ml:2 }}>
            Fixed Income
          </Typography>
  
          {/* Push everything after this to the right */}
          <Box sx={{ flexGrow: 1 }}/>
            {user ? (
              <>
                <IconButton onClick={handleAvatarClick} size="small">
                  <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.dark', fontSize: 14 }}>
                    {user[0].toUpperCase()}
                  </Avatar>
                </IconButton>

                <MuiMenu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  slotProps={{ paper: {elevation: 2, sx: {mt: 1, minWidth: 180}} }}
                >
                  <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant='body2' fontWeight={600}>{user}</Typography>
                    <Typography variant='caption' color="text.secondary">Signed in</Typography>
                  </Box>
                  <MenuItem onClick={handleLogout} sx={{ gap: 1.5, mt:0.5, color:'error.main' }}>
                    <LogoutIcon fontSize="small"/>
                    Sign out
                  </MenuItem>
                </MuiMenu>
              </>
            ): (
              <Button
                color="inherit"
                startIcon={<LoginIcon/>}
                onClick={() => navigate('/login')}
                size="small"
              >
                  Sign in
              </Button>
            )}

        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: isBigMenu? drawerWidth: shortDrawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: isBigMenu? drawerWidth: shortDrawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        {isBigMenu? <Menu/>: <ShortMenu/>}
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {content}
     </Box>
    </Box>
  );
}
