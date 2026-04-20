import { React, useState, useEffect } from 'react'
import AxiosInstance from './Axios'
import { Box, Typography } from '@mui/material';
import AddBoxIcon from '@mui/icons-material/AddBox';
import Button from '@mui/material/Button';
import TextForm from './Forms/TextForm';
import SelectForm from './Forms/SelectForm';
import DatePickerForm from './Forms/DatePickerForm';
import * as yup from 'yup'
import { useNavigate } from 'react-router';
import { useForm, Controller } from "react-hook-form"
import { yupResolver } from '@hookform/resolvers/yup';
import { formatDateParam } from '../utils/DateUtils';   
import Alert from '@mui/material/Alert';
import { formatFieldErrors, getApiErrorMessage } from '../utils/apiError';

const fieldLabels = {
    isin: "ISIN",
    issuer: "Issuer",
    bond_type: "Bond type",
    face_value: "Face value",
    coupon_rate: "Coupon rate",
    issue_date: "Issue date",
    maturity_date: "Maturity date"
};

const CreateBond = () => {
    const [meta, setMeta] = useState(null)
    const [issuers, setIssuers] = useState([])
    const [message, setMessage] = useState([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const navigate = useNavigate()

    const ValidationSchema = yup.object({
        isin: yup
            .string()
            .transform(value => value?.toUpperCase())
            .length(12, 'ISIN must be exactly 12 characters')
            .matches(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/, 'Invalid ISIN format (e.g. US0378331005)')
            .required('Required field'),
        issuer: yup
            .number()
            .integer('Issuer must be valid')
            .positive()
            .required('Required field'),
        bond_type: yup
            .string()
            .required('Required field'),
        face_value: yup
            .number()
            .typeError('Face value must be a number')
            .positive('Face value must be positive')
            .required('Required field'),
        coupon_rate: yup
            .number()
            .typeError('Coupon rate must be a number')
            .min(0, 'Coupon rate cannot be negative')
            .max(100, 'Coupon rate cannot exceed 100%')
            .required('Required field'),
        issue_date: yup
            .date()
            .typeError('Invalid issue date')
            .required('Required field'),
        maturity_date: yup
            .date()
            .typeError('Invalid maturity date')
            .required('Required field')
            .min(yup.ref('issue_date'), 'Maturity date must be after issue date'),
    })

    const { handleSubmit, control, watch, formState: { errors } } = useForm({
        defaultValues: {
            isin: '',
            issuer: '',
            bond_type: '',
            face_value: '',
            coupon_rate: '',
            issue_date: '',
            maturity_date: ''
        },
        resolver: yupResolver(ValidationSchema)
    });

    const issueDate = watch('issue_date')

    const onSubmit = async (values) => {
        const formattedValues = {
            ...values,
            issue_date:    formatDateParam(values.issue_date),
            maturity_date: formatDateParam(values.maturity_date)
        }

        setIsSubmitting(true)
        try {
            await AxiosInstance.post('bonds/', formattedValues)
            setMessage(
                <Alert severity="success" sx={{ mt: 2 }}>Successfully submitted data</Alert>
            )
            setTimeout(() => {
                navigate('/')
            }, 2000)
        } catch (error) {
            const fieldErrors = formatFieldErrors(error.response?.data, fieldLabels)
            const fallback = getApiErrorMessage(error)
            setMessage(
                <Alert severity="error" sx={{ mt:2, whiteSpace: 'pre-line' }}>{fieldErrors || fallback}</Alert>
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    useEffect(() => {
        let isMounted = true

        Promise.all([
            AxiosInstance.get('api/meta/'),
            AxiosInstance.get('issuers/'),
        ])
            .then(([metaRes, issuersRes]) => {
                if (!isMounted) return
                setMeta(metaRes.data)
                setIssuers(issuersRes.data)
            })
            .catch(() => {
                if (isMounted) {
                    setMessage(
                        <Alert severity="error" sx={{ mt:2 }}>
                            Failed to load form data. Please refresh and try again.
                        </Alert>
                    )
                }
            })

        return () => {
            isMounted = false
        }
    },[])
    if (!meta || issuers === undefined) return null;

    return (
        <div>
            <Box className={"TopBar"}>
                <AddBoxIcon/>
                <Typography sx={{marginLeft:'15px'}}>Create Bond</Typography>
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
                    <Box sx={{ gridColumn: { md: '1/-1' } }}>
                        <Controller
                            name='isin'
                            control={control}
                            render={({ field }) => (
                                <TextForm
                                    label='ISIN'
                                    name={field.name}
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    error={Boolean(errors.isin)}
                                    helperText={errors.isin?.message}
                                />
                            )}
                        >
                        </Controller>
                    </Box>
                    <Controller
                        name='issuer'
                        control={control}
                        render={({ field }) => (
                            <SelectForm
                                label={'Issuer'}
                                options={issuers}
                                name={field.name}
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                error={Boolean(errors.issuer)}
                                helperText={errors.issuer?.message}
                            />
                        )}
                    >
                    </Controller>
                    <Controller
                        name="bond_type"
                        control={control}
                        render={({ field }) => (
                            <SelectForm
                                label={'Bond Type'}
                                options={meta.bond_types}
                                name={field.name}
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                error={Boolean(errors.bond_type)}
                                helperText={errors.bond_type?.message}
                            />
                        )}
                    >
                    </Controller>
                    <Controller
                        name="face_value"
                        control={control}
                        render={({ field }) => (
                            <TextForm
                                label='Face Value'
                                name={field.name}
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                error={Boolean(errors.face_value)}
                                helperText={errors.face_value?.message}
                            />
                        )}
                    >
                    </Controller>
                    <Controller
                        name="coupon_rate"
                        control={control}
                        render={({ field }) => (
                            <TextForm
                                label='Coupon Rate'
                                name={field.name}
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                error={Boolean(errors.coupon_rate)}
                                helperText={errors.coupon_rate?.message}
                            />
                        )}
                    >
                    </Controller>
                    <Controller
                        name="issue_date"
                        control={control}
                        render={({ field }) => (
                            <DatePickerForm
                                label={'Issue Date'}
                                name={field.name}
                                value={field.value}
                                onChange={field.onChange}
                                error={Boolean(errors.issue_date)}
                                helperText={errors.issue_date?.message}
                            />
                        )}
                    >
                    </Controller>
                    <Controller
                        name="maturity_date"
                        control={control}
                        render={({ field }) => (
                            <DatePickerForm
                                label='Maturity Date'
                                name={field.name}
                                value={field.value}
                                onChange={field.onChange}
                                error={Boolean(errors.maturity_date)}
                                helperText={errors.maturity_date?.message}
                                minDate={issueDate}
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

export default CreateBond
