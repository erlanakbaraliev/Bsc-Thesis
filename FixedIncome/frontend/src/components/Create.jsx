import {React, useState, useEffect} from 'react'
import AxiosInstance from './Axios'

const Create = () => {
    const [users, setUsers] = useState([])
    console.log(users)

    const GetData = ()=>{
        AxiosInstance.get('users/').then((res)=>{
            setUsers(res.data.results)
        })
    }

    useEffect(()=>{
        GetData()
    },[])

    return (
        <div>
            Create page
        </div>
    )
}

export default Create
