import './App.css'
import { Routes, Route, BrowserRouter } from 'react-router'
import Home from './components/Home'
import CreateIssuer from './components/CreateIssuer'
import CreateBond from './components/CreateBond'
import Navbar from './components/Navbar/Navbar'
import LoginPage from './components/LoginPage.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import PrivateRouter from './components/PrivateRoute.jsx'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar
          content={
            <Routes>
              <Route path="" element={
                <PrivateRouter>
                  <Home/>
                </PrivateRouter>
              }/>
              <Route path="/create/issuer/" element={
                <PrivateRouter>
                  <CreateIssuer/>
                </PrivateRouter>
              }/> 
              <Route path="/create/bond/" element={
                <PrivateRouter>
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
