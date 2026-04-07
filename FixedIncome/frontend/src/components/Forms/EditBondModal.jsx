import {React, useState, useEffect} from 'react'
import TextField from '@mui/material/TextField';
import AddBoxIcon from '@mui/icons-material/AddBox';
import { DialogActions,  Typography } from "@mui/material"
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import DialogContent from '@mui/material/DialogContent';
import { CircularProgress } from '@mui/material'
import AxiosInstance from '../Axios';
import SelectForm from './SelectForm';
import TextForm from './TextForm';
import DatePickerForm from './DatePickerForm';
import { useForm, Controller } from "react-hook-form"
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'

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

const EditBondModal = ({row, table, onSaved}) => {
    const [issuers, setIssuers] = useState([]);
    // If issuer changes, country and credit_rating automatically changes (country, credit_rating can't be edited)
    const [selectedIssuer, setSelectedIssuer]= useState();
    const [meta, setMeta] = useState();
    const bond = row.original;
    const { handleSubmit, control, watch, formState: {errors} } = useForm({
        defaultValues: {
            isin: bond.isin,
            issuer: bond.issuer,
            issuer_country: bond.issuer_country,
            credit_rating: bond.credit_rating,
            bond_type: bond.bond_type,
            face_value: bond.face_value,
            coupon_rate: bond.coupon_rate,
            issue_date: bond.issue_date,
            maturity_date: bond.maturity_date
        },
        resolver: yupResolver(ValidationSchema),
    });

    const issueDate = watch('issue_date');
    
    useEffect(()=>{
        Promise.all([
            AxiosInstance.get('api/meta/'),
            AxiosInstance.get('issuers/'),
        ]).then(([metaRes, issuersRes]) => {
            setMeta(metaRes.data)
            setIssuers(issuersRes.data.results)
            const issuerObject = issuersRes.data.results.find(i => i.id === bond.issuer);
            setSelectedIssuer(issuerObject)
        })
    },[]);

    const onSubmit = (data, e) => {
        AxiosInstance.patch(`bonds/${bond.id}/`, data)
        .then((res)=>{
            onSaved(bond.id, res.data);
            table.setEditingRow(null);
        })
    };

    const isLoading = issuers.length === 0;

    return (
        <>
            <Box className={"TopBar"}>
                <AddBoxIcon/>
                <Typography sx={{marginLeft: '15px'}}>Edit Bond</Typography>
            </Box>

            <DialogContent>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: {xs: '1fr', md: '1fr 1fr'},
                        gap:'30px',
                        padding: '15px',
                        boxShadow: 'rgba(100,100,111,0.2) 0px 7px 29px 0px',
                    }}>
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
                        />
                        <Controller
                            name='issuer'
                            control={control}
                            render={( {field} ) => (
                                <SelectForm 
                                    label={'Issuer'} 
                                    options={issuers}
                                    name={field.name}
                                    value={field.value}
                                    onChange={(e)=>{
                                        field.onChange(e)
                                        const issuer = issuers.find(i => i.id === Number(e.target.value))
                                        setSelectedIssuer(issuer || null)
                                    }}
                                    onBlur={field.onBlur}
                                    error={Boolean(errors.issuer)}
                                    helperText={errors.issuer?.message}
                                />
                            )}
                        />
                        <TextField label="Industry" value={selectedIssuer?.industry || ''} disabled fullWidth/>
                        <TextField label="Issuer Country" value={selectedIssuer?.country || ''} disabled fullWidth/>
                        <TextField label="Credit Rating" value={selectedIssuer?.credit_rating || ''} disabled fullWidth/>
                        <Controller
                            name='bond_type'
                            control={control}
                            render={( {field} ) => (
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
                        />
                        <Controller
                            name='face_value'
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
                        />
                        <Controller
                            name='coupon_rate'
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
                        />
                        <Controller
                            name='issue_date'
                            control={control}
                            render={({ field }) => (
                                <DatePickerForm
                                    label='Issue Date'
                                    name={field.name}
                                    value={field.value}
                                    onChange={(name, value) => field.onChange(value)}
                                    error={Boolean(errors.issue_date)}
                                    helperText={errors.issue_date?.message}
                                />
                            )}
                        />
                        <Controller
                            name='maturity_date'
                            control={control}
                            render={({ field }) => (
                                <DatePickerForm
                                    label='Maturity Date'
                                    name={field.name}
                                    value={field.value}
                                    onChange={(name, value) => field.onChange(value)}
                                    error={Boolean(errors.maturity_date)}
                                    helperText={errors.maturity_date?.message}
                                    minDate={issueDate}
                                />
                            )}
                        />
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => table.setEditingRow(null)}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isLoading}>Submit</Button>
            </DialogActions>
        </>
    )
}

export default EditBondModal
