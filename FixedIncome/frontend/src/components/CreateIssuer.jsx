import {React, useState, useEffect} from 'react'
import AxiosInstance from './Axios'
import {Box, Typography} from '@mui/material';
import AddBoxIcon from '@mui/icons-material/AddBox';
import Button from '@mui/material/Button';
import TextForm from './Forms/TextForm';
import SelectForm from './Forms/SelectForm';
import { getData } from 'country-list';

const CreateIssuer = () => {
    const [meta, setMeta] = useState(null)

    useEffect(()=>{
        AxiosInstance.get('api/meta/').then((res)=>{
            setMeta(res.data)
        })
    },[])
    if (!meta) return null;

    return (
        <div>
            <Box className={"TopBar"}>
                <AddBoxIcon/>
                <Typography sx={{marginLeft:'15px'}}>Create Issuer</Typography>
            </Box>
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: '30px',
                padding: '15px',
                boxShadow: 'rgba(100,100,111,0.2) 0px 7px 29px 0px',
            }}>
                <TextForm label={'Name'} />                                          
                <SelectForm label={'Country'} options={getData()} valueKey='code' /> 
                <SelectForm label={'Industry'} options={meta.industries} />          
                <SelectForm label={'Credit Rating'} options={meta.credit_ratings} /> 
                <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                    <Button variant="contained" fullWidth>Submit</Button>
                </Box>
            </Box>
       </div>
    )
}

export default CreateIssuer
