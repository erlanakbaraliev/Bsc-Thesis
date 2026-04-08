import './App.css'
import { Routes, Route } from 'react-router'
import Home from './components/Home'
import CreateIssuer from './components/CreateIssuer'
import CreateBond from './components/CreateBond'
import Navbar from './components/Navbar/Navbar'

function App() {
  return (
    <>
      <Navbar
        content={
          <Routes>
            <Route path="" element={<Home/>}/>
            <Route path="/create/issuer/" element={<CreateIssuer/>}/> 
            <Route path="/create/bond/" element={<CreateBond/>}/> 
          </Routes>
        }
      />
   </>
  )
}

export default App
