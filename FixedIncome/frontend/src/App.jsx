import './App.css'
import { Routes, Route, BrowserRouter } from 'react-router'
import Home from './components/Home'
import BondAnalyticsDashboard from './components/BondAnalyticsDashboard'
import UserManagement from './components/UserManagement'
import CreateIssuer from './components/CreateIssuer'
import CreateBond from './components/CreateBond'
import Navbar from './components/Navbar/Navbar'
import LoginPage from './components/LoginPage.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import PrivateRouter from './components/PrivateRoute.jsx'

const WRITE_ROLES = ['ADMIN', 'EDITOR']
const ADMIN_ONLY = ['ADMIN']

function App({ themeMode, onToggleTheme }) {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar
          themeMode={themeMode}
          onToggleTheme={onToggleTheme}
          content={
            <Routes>
              <Route path="" element={
                <PrivateRouter>
                  <Home/>
                </PrivateRouter>
              }/>
              <Route path="/dashboard/" element={
                <PrivateRouter>
                  <BondAnalyticsDashboard/>
                </PrivateRouter>
              }/>
              <Route path="/users/" element={
                <PrivateRouter allowedRoles={ADMIN_ONLY}>
                  <UserManagement/>
                </PrivateRouter>
              }/>
              <Route path="/create/issuer/" element={
                <PrivateRouter allowedRoles={WRITE_ROLES}>
                  <CreateIssuer/>
                </PrivateRouter>
              }/> 
              <Route path="/create/bond/" element={
                <PrivateRouter allowedRoles={WRITE_ROLES}>
                  <CreateBond/>
                </PrivateRouter>
              }/> 
              <Route path="/login/" element={<LoginPage/>}/>
            </Routes>
          }
        />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
