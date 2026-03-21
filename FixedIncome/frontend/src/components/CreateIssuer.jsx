import {React, useState, useEffect} from 'react'
import AxiosInstance from './Axios'
import {Box, Typography} from '@mui/material';
import AddBoxIcon from '@mui/icons-material/AddBox';
import Button from '@mui/material/Button';
import TextForm from './Forms/TextForm';
import SelectForm from './Forms/SelectForm';
import { getData } from 'country-list';
import { useFormik } from 'formik';
import * as yup from 'yup'


const CreateIssuer = () => {
    const [meta, setMeta] = useState(null)
    const ValidationSchema = yup.object({
        name: yup
            .string()
            .min(2, 'Must be at least 2 chars')
            .max(100, 'Must be less than 100 chars')
            .required('Required field'),
        country: yup
            .string()
            .required('Required field'),
        industry: yup
            .string()
            .required('Required field'),
        credit_rating: yup
            .string()
            .required('Required field')
    })
    const formik = useFormik({
        initialValues: {
            name:'',
            country:'',
            industry:'',
            credit_rating:''
        },

        validationSchema: ValidationSchema,

        onSubmit: (values)=>{
            // AxiosInstance.post('issuers/', values)
            // .then(()=>{
            //     console.log('Successfull data submission')
            // })
        }
    })

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
                        error={formik.touched.name && Boolean(formik.errors.name)}
                        helperText={formik.touched.name && formik.errors.name}
                    />                                          
                    <SelectForm 
                        label={'Country'} options={getData()} valueKey='code' 
                        name='country' value={formik.values.country}
                        onChange={formik.handleChange} onBlur={formik.handleBlur}
                        error={formik.touched && Boolean(formik.errors.country)}
                        helperText={formik.touched && formik.errors.country}
                    /> 
                    <SelectForm 
                        label={'Industry'} options={meta.industries} 
                        name='industry' value={formik.values.industry}
                        onChange={formik.handleChange} onBlur={formik.handleBlur}
                        error={formik.touched && Boolean(formik.errors.industry)}
                        helperText={formik.touched && formik.errors.industry}
                    />          
                    <SelectForm 
                        label={'Credit Rating'} options={meta.credit_ratings} 
                        name='credit_rating' value={formik.values.credit_rating}
                        onChange={formik.handleChange} onBlur={formik.handleBlur}
                        error={formik.touched && Boolean(formik.errors.credit_rating)}
                        helperText={formik.touched && formik.errors.credit_rating}
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
