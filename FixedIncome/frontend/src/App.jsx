import './App.css'
import { Routes, Route } from 'react-router'
import Home from './components/Home'
import CreateIssuer from './components/CreateIssuer'
import CreateBond from './components/CreateBond'
import Edit from './components/Edit'
import Delete from './components/Delete'
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
            <Route path="/edit/:id" element={<Edit/>}/> 
            <Route path="/delete/:id" element={<Delete/>}/>
          </Routes>
        }
      />
   </>
  )
}

export default App
