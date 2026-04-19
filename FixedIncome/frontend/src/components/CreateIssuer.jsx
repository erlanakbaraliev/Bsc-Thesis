import {React, useState, useEffect} from 'react'
import AxiosInstance from './Axios'
import {Box, Typography} from '@mui/material';
import AddBoxIcon from '@mui/icons-material/AddBox';
import Button from '@mui/material/Button';
import TextForm from './Forms/TextForm';
import SelectForm from './Forms/SelectForm';
import { getData } from 'country-list';
import * as yup from 'yup'
import { useNavigate } from 'react-router';
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup';
import Alert from '@mui/material/Alert';
import { formatFieldErrors, getApiErrorMessage } from '../utils/apiError';

const fieldLabels = {
    name: "Name",
    country: "Country",
    industry: "Industry",
    credit_rating: "Credit Rating"
};

const CreateIssuer = () => {
    const [meta, setMeta] = useState(null)
    const [message, setMessage] = useState([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const navigate = useNavigate()

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

    const { handleSubmit, control, formState: {errors} } = useForm({
        resolver: yupResolver(ValidationSchema)
    })

    const onSubmit = async (values) => {
        setIsSubmitting(true)
        try {
            await AxiosInstance.post('issuers/', values)
            setMessage(
             <Alert severity="success" sx={{ mt:2 }}>Successfully submitted data</Alert>
            )
            setTimeout(()=>{
                navigate('/')
            },2000)
        } catch (error) {
            const fieldErrors = formatFieldErrors(error.response?.data, fieldLabels)
            const fallback = getApiErrorMessage(error)
            const errorText = fieldErrors || fallback
            setMessage(
                <Alert severity="error" sx={{ mt:2, whiteSpace: 'pre-line' }}>{errorText}</Alert>
            )
        } finally {
            setIsSubmitting(false)
        }
    }

   useEffect(()=>{
        let isMounted = true

        AxiosInstance.get('api/meta/')
            .then((res)=>{
                if (isMounted) {
                    setMeta(res.data)
                }
            })
            .catch(() => {
                if (isMounted) {
                    setMessage(
                        <Alert severity="error" sx={{ mt:2 }}>
                            Failed to load metadata. Please refresh and try again.
                        </Alert>
                    )
                }
            })

        return () => {
            isMounted = false
        }
    },[])
    if (!meta) return null;


    return (
        <div>
            <Box className={"TopBar"}>
                <AddBoxIcon/>
                <Typography sx={{marginLeft:'15px'}}>Create Issuer</Typography>
            </Box>
            
            {message}

            <form>
               <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: '30px',
                    padding: '15px',
                    boxShadow: 'rgba(100,100,111,0.2) 0px 7px 29px 0px',
                }}>
                    <Controller
                        name="name"
                        control={control}
                        render={( {field} ) => (
                            <TextForm 
                                label='Name'
                                name={field.name}
                                value={field.value}
                                onChange={field.onChange} 
                                onBlur={field.onBlur}
                                error={Boolean(errors.name)}
                                helperText={errors.name?.message}
                            />        
                        )}
                    >
                    </Controller>
                    <Controller
                        name="country"
                        control={control}
                        render={( {field} ) => (
                            <SelectForm 
                                label={'Country'} 
                                options={getData()} 
                                valueKey='code' 
                                name={field.name}
                                value={field.value}
                                onChange={field.onChange} 
                                onBlur={field.onBlur}
                                error={Boolean(errors.country)}
                                helperText={errors.country?.message}
                            /> 
                        )}
                    >
                    </Controller>
                    <Controller
                        name="industry"
                        control={control}
                        render={( {field} ) => (
                            <SelectForm 
                                label={'Industry'} 
                                options={meta.industries} 
                                name={field.name}
                                value={field.value}
                                onChange={field.onChange} 
                                onBlur={field.onBlur}
                                error={Boolean(errors.industry)}
                                helperText={errors.industry?.message}
                            /> 
                        )}
                    >     
                    </Controller>
                    <Controller
                        name="credit_rating"
                        control={control}
                        render={( {field} ) => (
                            <SelectForm 
                                label={'Credit Rating'} 
                                options={meta.credit_ratings} 
                                name={field.name}
                                value={field.value}
                                onChange={field.onChange} 
                                onBlur={field.onBlur}
                                error={Boolean(errors.credit_rating)}
                                helperText={errors.credit_rating?.message}
                            /> 
                        )}
                    >
                    </Controller>
                    <Box sx={{ gridColumn: { md: '1 / -1' } }}>
                        <Button type="submit" variant="contained" onClick={handleSubmit(onSubmit)} fullWidth disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </Button>
                    </Box>
                </Box>
            </form>
       </div>
    )
}

export default CreateIssuer
