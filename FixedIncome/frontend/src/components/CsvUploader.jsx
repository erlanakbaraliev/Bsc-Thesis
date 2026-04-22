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
  Typography,
  Alert,
  Stack,
} from '@mui/material'

import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import { useDropzone } from 'react-dropzone'

import AxiosInstance from './Axios';
import { getApiErrorMessage } from '../utils/apiError';

const CsvUploader = ({ onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [importStats, setImportStats] = useState(null);

  // Preview states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewStats, setPreviewStats] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return;

    setUploading(true);
    setResult(null);
    setImportStats(null);
    setSelectedFile(file)

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await AxiosInstance.post('bonds/import_preview/', formData, {
        headers: { 'Content-Type': 'multipart/form-data'}
      })
      setPreviewStats(response.data);
    } catch (error) {
      setResult({ type: 'error', msg: getApiErrorMessage(error, 'Preview failed') })
    } finally {
      setUploading(false)
    }
  }, [])

  const handleConfirmUpload = async () => {
    if (!selectedFile) {
      setResult({ type: 'error', msg: 'No file selected for upload.' })
      return;
    }

    setPreviewStats(null); // Close modal
    setUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await AxiosInstance.post('bonds/import_csv/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImportStats(response.data);
      setResult({ type: 'success', msg: `Successfully processed ${selectedFile.name}.` });
      setSelectedFile(null);
      if (onSuccess) setTimeout(onSuccess, 2000); // Refresh table
    } catch (error) {
      setResult({ type: 'error', msg: getApiErrorMessage(error, 'Upload failed.') });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSkippedCsv = async () => {
    if (!importStats?.skipped_csv_url) return;

    try {
      const response = await AxiosInstance.get(importStats.skipped_csv_url, {
        responseType: 'blob',
      });
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      const filename = `skipped_bonds_${new Date().toISOString().slice(0, 10)}.csv`;
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      setResult({ type: 'error', msg: getApiErrorMessage(error, 'Failed to download skipped CSV.') });
    }
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
    <Box sx={{ mb: 3 }}>
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
            <CloudUploadIcon sx={{ fontSize: 48, color: 'grey.500', mb: 1 }} />
            <Typography variant='h6'> Drag & Drop you CSV here</Typography>
          </>
        )}
      </Box>
  
      {result && <Alert severity={result.type} sx={{ mt:2 }}>{result.msg}</Alert>}
      {importStats && (
        <Alert severity={importStats.skipped_count > 0 ? 'warning' : 'success'} sx={{ mt:2 }}>
          <Stack spacing={0.5}>
            <Typography variant='body2'>
              Total rows: <b>{importStats.total_rows}</b>
            </Typography>
            <Typography variant='body2'>
              Created: <b>{importStats.created_count}</b>
            </Typography>
            <Typography variant='body2'>
              Updated: <b>{importStats.updated_count}</b>
            </Typography>
            <Typography variant='body2'>
              Skipped: <b>{importStats.skipped_count}</b>
            </Typography>
            {importStats.skipped_count > 0 && importStats.skipped_csv_url && (
              <Box sx={{ pt: 1 }}>
                <Button onClick={handleDownloadSkippedCsv} size='small' variant='outlined'>
                  Download skipped CSV
                </Button>
              </Box>
            )}
          </Stack>
        </Alert>
      )}

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
          <Typography variant='body2' color="textSecondary" sx={{ mt: 2 }}>
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
