import {React, useState, useEffect} from 'react'
import AxiosInstance from './Axios'
import {Box, Typography} from '@mui/material';
import AddBoxIcon from '@mui/icons-material/AddBox';
import Button from '@mui/material/Button';
import TextForm from './Forms/TextForm';
import SelectForm from './Forms/SelectForm';
import DatePickerForm from './Forms/DatePickerForm';
import { useFormik } from 'formik'; 
import * as yup from 'yup'

const CreateBond = () => {
    const [meta, setMeta] = useState(null)
    const ValidatationSchema = yup.object({
        isin: yup
            .string('Example: US0378331005')    
            .matches(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/, 'Invalid ISIN format (e.g. US0378331005)')
            .required('Required field'),
        issuer: yup
            .string()
            .required('Required field'),
        bond_type: yup
            .string()
            .required('Required field'),
        face_value: yup
            .number()
            .required('Required field'),
        coupon_rate: yup
            .number()
            .required('Required field'),
        issue_date: yup
            .date()
            .required('Required field'),
        maturity_date: yup
            .date()
            .required('Required field')    
            .min(
                yup.ref('issue_date'),
                'Maturity date must be after issue date'
    )
    })
    const [issuers, setIssuers] = useState([])
    const formik = useFormik({
        initialValues: {
            isin:'',
            issuer:'',
            bond_type:'',
            face_value:'',
            coupon_rate:'',
            issue_date:'',
            maturity_date:''
        },

        validationSchema: ValidatationSchema,

        onSubmit: (values)=>{
            AxiosInstance.post('bonds/', values)
            .then(()=>{
                console.log("Successful data submission")
            })
        }
    })

    useEffect(()=>{
        AxiosInstance.get('api/meta/').then((res)=>{
            setMeta(res.data)
        })
        AxiosInstance.get('issuers/').then((res)=>{
            setIssuers(res.data.results)
        })
    },[])
    if (!meta || issuers.length === 0) return null;

    return (
        <div>
            <Box className={"TopBar"}>
                <AddBoxIcon/>
                <Typography sx={{marginLeft:'15px'}}>Create Bond</Typography>
            </Box>
            <form onSubmit={formik.handleSubmit}>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: {xs: '1fr', md: '1fr 1fr'},
                    gap:'30px',
                    padding: '15px',
                    boxShadow: 'rgba(100,100,111,0.2) 0px 7px 29px 0px',
                }}>
                    <Box sx={{ gridColumn: {md: '1/-1'} }}>
                        <TextForm 
                            label={'ISIN'}
                            name='isin' 
                            value={formik.values.isin}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            error={formik.touched && Boolean(formik.errors.isin)}
                            helperText={formik.touched && formik.errors.isin}
                        />
                    </Box>
                    <SelectForm 
                        label={'Issuer'} 
                        options={issuers}
                        name='issuer' 
                        value={formik.values.issuer}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched && Boolean(formik.errors.issuer)}
                        helperText={formik.touched && formik.errors.issuer}
                    />
                    <SelectForm 
                        label={'Bond Type'}
                        options={meta.bond_types}
                        name='bond_type' 
                        value={formik.values.bond_type}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched && Boolean(formik.errors.bond_type)}
                        helperText={formik.touched && formik.errors.bond_type}
                    />
                    <TextForm 
                        label={'Face Value'}
                        name='face_value' 
                        value={formik.values.face_value}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched && Boolean(formik.errors.face_value)}
                        helperText={formik.touched && formik.errors.face_value}
                    />
                    <TextForm 
                        label={'Coupon Rate'}
                        name='coupon_rate' 
                        value={formik.values.coupon_rate}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched && Boolean(formik.errors.coupon_rate)}
                        helperText={formik.touched && formik.errors.coupon_rate}
                    />
                    <DatePickerForm
                        label={'Issue Date'}
                        name='issue_date'
                        value={formik.values.issue_date}
                        onChange={formik.setFieldValue}
                        error={formik.touched && Boolean(formik.errors.issue_date)}
                        helperText={formik.touched && formik.errors.issue_date}
                    />
                    <DatePickerForm
                        label={'Maturity Date'}
                        name='maturity_date'
                        value={formik.values.maturity_date}
                        onChange={formik.setFieldValue}
                        error={formik.touched && Boolean(formik.errors.maturity_date)}
                        helperText={formik.touched && formik.errors.maturity_date}
                        minDate={formik.values.issue_date}
                    />
                    <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                        <Button type="submit" variant="contained" fullWidth>Submit</Button>
                    </Box>
                </Box>
            </form>
        </div>
    )
}

export default CreateBond
