import {React, useState, useEffect} from 'react'
import AxiosInstance from './Axios'
import {Box, Typography} from '@mui/material';
import AddBoxIcon from '@mui/icons-material/AddBox';
import Button from '@mui/material/Button';
import TextForm from './Forms/TextForm';
import SelectForm from './Forms/SelectForm';
import DateTimePicker from './Forms/DateTimePicker';

const CreateBond = () => {
    const [meta, setMeta] = useState(null)
    const [issuers, setIssuers] = useState([])

    useEffect(()=>{
        AxiosInstance.get('api/meta/').then((res)=>{
            setMeta(res.data)
        })
        AxiosInstance.get('issuers/').then((res)=>{
            setIssuers(res.data.results)
        })
    },[])
    if (!meta || !issuers) return null;

    return (
        <div>
            <Box className={"TopBar"}>
                <AddBoxIcon/>
                <Typography sx={{marginLeft:'15px'}}>Create Bond</Typography>
            </Box>

            <Box sx={{
                display: 'grid',
                gridTemplateColumns: {xs: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr'},
                gap:'30px',
                padding: '15px',
                boxShadow: 'rgba(100,100,111,0.2) 0px 7px 29px 0px',
            }}>
                <TextForm label={'ISIN'}/>
                <SelectForm label={'Issuer'} options={issuers}/>
                <SelectForm label={'Credit Rating'} options={meta.credit_ratings}/>
                <SelectForm label={'Bond Type'} options={meta.bond_types}/>
                <TextForm label={'Face Value'}/>
                <TextForm label={'Coupon Rate'}/>
                <DateTimePicker label={'Issue Date'}/>
                <DateTimePicker label={'Maturity Date'}/>
                <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                    <Button variant="contained" fullWidth>Submit</Button>
                </Box>

            </Box>
        </div>
    )
}

export default CreateBond
