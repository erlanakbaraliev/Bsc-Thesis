import { useCallback, useState } from 'react';

// MUI components
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  IconButton,
  Typography,
  Alert,
} from '@mui/material'

import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import { useDropzone } from 'react-dropzone'

import AxiosInstance from './Axios';

const CsvUploader = ({ onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  // Preview states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewStats, setPreviewStats] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return;

    setUploading(true);
    setResult(null);
    setSelectedFile(file)

    const formData = new FormData();
    formData.append('file', file);

    AxiosInstance.post('bonds/import_preview/', formData, {
      headers: { 'Content-Type': 'multipart/form-date'}
    })
      .then((response) => {
        setPreviewStats(response.data);
      })
      .catch((error) => {
        setResult({ type: 'error', msg: error.response?.data?.error || 'Preview failed' })
      })
      .finally(() => {
        setUploading(false)
      })
  }, [])

  const handleConfirmUpload = () => {
    setPreviewStats(null); // Close modal
    setUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    // Step 2: Actually import the data
    AxiosInstance.post('bonds/import_csv/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
      .then(() => {
        setResult({ type: 'success', msg: `Successfully processed ${selectedFile.name}.` });
        setSelectedFile(null);
        if (onSuccess) setTimeout(onSuccess, 2000); // Refresh table
      })
      .catch((error) => {
        setResult({ type: 'error', msg: error.response?.data?.error || 'Upload failed.' });
      })
      .finally(() => {
        setUploading(false);
      });
  };

  const handleCancel = () => {
    setPreviewStats(null);
    setSelectedFile(null);
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  })

  return (
    <Box sx={{ mb:3 }}>
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.400',
          backgroundColor: isDragActive ? 'primary.light' : 'background.paper',
          padding: '40px',
          textAlign: 'center',
          cursor: 'pointer',
          borderRadius: 2,
        }}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <CircularProgress />
        ) : (
          <>
              <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.500', mb:1 }}/>
              <Typography variant='h6'> Drag & Drop you CSV here</Typography>
          </>
        )}
      </Box>
  
      {result && <Alert severity={result.type} sx={{ mt:2 }}>{result.msg}</Alert>}

      <Dialog open={Boolean(previewStats)} onClose={handleCancel} maxWidth='sm' fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Confirm Data Import</DialogTitle>
        <DialogContent dividers>
          <Typography gutterBottom>
            We analyzed <b>{selectedFile?.name}</b>. Here is what will happen if you proceed:
          </Typography>
          <ul>
            <li><b>{previewStats?.new}</b> new bonds will be inserted</li>
            <li><b>{previewStats?.existing}</b> existing bonds will be updated with the new bond data</li>
          </ul>
          <Typography variant='body2' color="textSecondary" sx={{ mt:2 }}>
            Total rows detected: {previewStats?.total}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCancel} color="inherit">Cancel</Button>
          <Button onClick={handleConfirmUpload} variant="contained" color="primary">
            Confirm & Import
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CsvUploader
