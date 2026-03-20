import {React, useState, useEffect} from 'react'
import AxiosInstance from './Axios'
import {Box, Typography} from '@mui/material';
import AddBoxIcon from '@mui/icons-material/AddBox';
import Button from '@mui/material/Button';
import TextForm from './Forms/TextForm';
import SelectForm from './Forms/SelectForm';
import { getData } from 'country-list';
import { useFormik } from 'formik';

const CreateIssuer = () => {
    const [meta, setMeta] = useState(null)
    const formik = useFormik({
        initialValues: {
            name:'',
            country:'',
            industry:'',
            credit_rating:''
        },

        onSubmit: (values)=>{
            AxiosInstance.post('issuers/', values)
            .then(()=>{
                console.log('Successfull data submission')
            })
        }
    })
    console.log(formik.values)

    useEffect(()=>{
        AxiosInstance.get('api/meta/').then((res)=>{
            setMeta(res.data)
        })
    },[])
    if (!meta) return null;


    return (
        <div>
            <form onSubmit={formik.handleSubmit}>
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
                    <TextForm 
                        label={'Name'} 
                        name='name' value={formik.values.name}
                        onChange={formik.handleChange} onBlur={formik.handleBlur}
                    />                                          
                    <SelectForm 
                        label={'Country'} options={getData()} valueKey='code' 
                        name='country' value={formik.values.country}
                        onChange={formik.handleChange} onBlur={formik.handleBlur}
                    /> 
                    <SelectForm label={'Industry'} options={meta.industries} 
                        name='industry' value={formik.values.industry}
                        onChange={formik.handleChange} onBlur={formik.handleBlur}
                    />          
                    <SelectForm label={'Credit Rating'} options={meta.credit_ratings} 
                        name='credit_rating' value={formik.values.credit_rating}
                        onChange={formik.handleChange} onBlur={formik.handleBlur}
                    /> 
                    <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                        <Button type="submit" variant="contained" fullWidth>Submit</Button>
                    </Box>
                </Box>
            </form>
       </div>
    )
}

export default CreateIssuer
