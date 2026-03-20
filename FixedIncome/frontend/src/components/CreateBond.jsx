import {React, useState, useEffect} from 'react'
import AxiosInstance from './Axios'
import {Box, Typography} from '@mui/material';
import AddBoxIcon from '@mui/icons-material/AddBox';
import Button from '@mui/material/Button';
import TextForm from './Forms/TextForm';
import SelectForm from './Forms/SelectForm';
import DatePickerForm from './Forms/DatePickerForm';
import { useFormik } from 'formik'; 

const CreateBond = () => {
    const [meta, setMeta] = useState(null)
    const [issuers, setIssuers] = useState([])
    const formik = useFormik({
        initialValues: {
            name:'',
            isin:'',
            issuer:'',
            bond_type:'',
            face_value:'',
            coupon_rate:'',
            issue_date:'',
            maturity_date:''
        },

        onSubmit: (values)=>{
            AxiosInstance.post('bonds/', values)
            .then(()=>{
                console.log("Successful data submission")
            })
        }
    })
    console.log(formik.values)

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
                        />
                    </Box>
                    <SelectForm 
                        label={'Issuer'} 
                        options={issuers}
                        name='issuer' 
                        value={formik.values.issuer}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                    />
                    <SelectForm 
                        label={'Bond Type'}
                        options={meta.bond_types}
                        name='bond_type' 
                        value={formik.values.bond_type}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                    />
                    <TextForm 
                        label={'Face Value'}
                        name='face_value' 
                        value={formik.values.face_value}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                    />
                    <TextForm 
                        label={'Coupon Rate'}
                        name='coupon_rate' 
                        value={formik.values.coupon_rate}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                    />
                    <DatePickerForm
                        label={'Issue Date'}
                        name='issue_date'
                        value={formik.values.issue_date}
                        onChange={formik.setFieldValue}
                    />
                    <DatePickerForm
                        label={'Maturity Date'}
                        name='maturity_date'
                        value={formik.values.maturity_date}
                        onChange={formik.setFieldValue}
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
